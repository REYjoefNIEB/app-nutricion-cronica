#!/usr/bin/env python3
"""
Convierte un VCF single-sample (o extrae una muestra de un VCF multi-sample)
a formato 23andMe v4 plain text.

Modos de uso:
  Archivo local:
    python scripts/vcf-to-23andme.py input.vcf[.gz] output.txt [SAMPLE_ID]

  Streaming desde URL (sin guardar el VCF a disco):
    python scripts/vcf-to-23andme.py --url <URL> --sample <SAMPLE_ID> --col <COL_IDX> output.txt

Formato de salida:
  # rsid  chromosome  position  genotype
  rs12913832  15  28356859  AA
  ...

NO requiere herramientas externas (tabix, bcftools, pysam).
"""

import sys
import gzip
import struct
import zlib
import urllib.request
import argparse
import time


# ── BGZF streaming ────────────────────────────────────────────────────────────

def _iter_bgzf_blocks(source):
    """Yield decompressed bytes from each BGZF block in source (file or HTTP response)."""
    buf = bytearray()
    while True:
        chunk = source.read(131072)  # 128KB read buffer
        if not chunk:
            break
        buf.extend(chunk)
        while len(buf) >= 26:
            if buf[0:2] != b'\x1f\x8b':
                raise ValueError(f"Invalid BGZF magic at offset (buf len={len(buf)})")
            bsize = struct.unpack('<H', buf[16:18])[0] + 1
            if len(buf) < bsize:
                break
            compressed = bytes(buf[18:bsize - 8])
            try:
                block = zlib.decompress(compressed, -15)
            except zlib.error:
                del buf[:bsize]
                continue
            yield block
            del buf[:bsize]


def iter_vcf_lines(source):
    """Yield decoded VCF lines from a BGZF stream source."""
    leftover = b''
    for block in _iter_bgzf_blocks(source):
        data = leftover + block
        lines = data.split(b'\n')
        leftover = lines[-1]
        for line in lines[:-1]:
            if line:
                yield line.decode('utf-8', errors='replace')
    if leftover:
        yield leftover.decode('utf-8', errors='replace')


# ── Genotype conversion ────────────────────────────────────────────────────────

def parse_genotype(gt, ref, alt):
    """Convert VCF GT field (0/0, 0/1, 1/1, 0|1 …) to two-letter allele string."""
    if not gt or gt in ('./.', '.|.', '.'):
        return '--'
    sep = '|' if '|' in gt else '/'
    parts = gt.split(sep)
    if len(parts) != 2:
        return '--'
    alts = alt.split(',')
    alleles = []
    for p in parts:
        if p == '.':
            return '--'
        try:
            idx = int(p)
        except ValueError:
            return '--'
        if idx == 0:
            alleles.append(ref)
        elif idx <= len(alts):
            alleles.append(alts[idx - 1])
        else:
            return '--'
    if any(len(a) != 1 for a in alleles):
        return '--'
    return ''.join(sorted(alleles))


# ── Core conversion ────────────────────────────────────────────────────────────

def convert(vcf_lines, output_path, sample_col, sample_id=''):
    written = skipped = 0
    t0 = time.time()

    with open(output_path, 'w', encoding='utf-8') as fout:
        fout.write('# rsid\tchromosome\tposition\tgenotype\n')
        fout.write(f'# Individual: {sample_id}\n')
        fout.write('# Source: 1000 Genomes Phase 3, Omni2.5M chip, build GRCh37\n')
        fout.write('# Format: 23andMe v4 plain text\n')

        for line in vcf_lines:
            if line.startswith('#'):
                continue

            cols = line.split('\t')
            if len(cols) <= sample_col:
                skipped += 1
                continue

            chrom    = cols[0]
            pos      = cols[1]
            vcf_id   = cols[2]
            ref      = cols[3]
            alt      = cols[4]
            fmt      = cols[8]
            sample   = cols[sample_col]

            # Clean compound IDs like "rs1426654,SNP15-46213776" → "rs1426654"
            if ',' in vcf_id:
                vcf_id = vcf_id.split(',')[0]

            if not vcf_id.startswith('rs'):
                skipped += 1
                continue
            if len(ref) != 1:
                skipped += 1
                continue

            # Extract GT field
            fmt_keys = fmt.split(':')
            try:
                gt_idx = fmt_keys.index('GT')
            except ValueError:
                skipped += 1
                continue

            sample_vals = sample.split(':')
            gt = sample_vals[gt_idx] if gt_idx < len(sample_vals) else '.'

            genotype = parse_genotype(gt, ref, alt)

            fout.write(f'{vcf_id}\t{chrom}\t{pos}\t{genotype}\n')
            written += 1

            if written % 100_000 == 0:
                elapsed = time.time() - t0
                print(f'  {written:,} SNPs written  ({elapsed:.0f}s elapsed)', flush=True)

    elapsed = time.time() - t0
    print(f'\nConversión completa:')
    print(f'  Escritos:  {written:,} SNPs')
    print(f'  Saltados:  {skipped:,} líneas')
    print(f'  Tiempo:    {elapsed:.1f}s')
    print(f'  Output:    {output_path}')
    return written


# ── Entry points ───────────────────────────────────────────────────────────────

def run_url(url, sample_col, sample_id, output_path):
    print(f'Streaming VCF desde URL (sin guardar a disco)...')
    print(f'  URL: {url[-60:]}')
    print(f'  Muestra: {sample_id} (col {sample_col})')
    print(f'  Output: {output_path}\n')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        lines = iter_vcf_lines(resp)
        return convert(lines, output_path, sample_col, sample_id)


def run_file(input_path, sample_id_or_col, output_path):
    opener = gzip.open if input_path.endswith('.gz') else open
    with opener(input_path, 'rb') as f:
        # Detect multi-sample and find column
        sample_col = 9  # default: first sample
        lines_gen = iter_vcf_lines(f)
        lines_buffered = []
        for line in lines_gen:
            lines_buffered.append(line)
            if line.startswith('#CHROM'):
                cols = line.split('\t')
                if sample_id_or_col and not sample_id_or_col.isdigit():
                    if sample_id_or_col in cols:
                        sample_col = cols.index(sample_id_or_col)
                elif sample_id_or_col and sample_id_or_col.isdigit():
                    sample_col = int(sample_id_or_col)
                break

        import itertools
        all_lines = itertools.chain(iter(lines_buffered), lines_gen)
        return convert(all_lines, output_path, sample_col, sample_id_or_col or '')


def main():
    parser = argparse.ArgumentParser(description='VCF → 23andMe converter')
    parser.add_argument('output', help='Output .txt file')
    parser.add_argument('input', nargs='?', help='Input VCF or VCF.gz file')
    parser.add_argument('--url',    help='Stream VCF from this URL instead of file')
    parser.add_argument('--sample', help='Sample ID to extract', default='')
    parser.add_argument('--col',    help='Column index of sample (0-based)', type=int)
    args = parser.parse_args()

    if args.url:
        if args.col is None:
            print('ERROR: --col is required with --url')
            sys.exit(1)
        run_url(args.url, args.col, args.sample, args.output)
    elif args.input:
        run_file(args.input, args.sample, args.output)
    else:
        print('ERROR: provide input file or --url')
        sys.exit(1)


if __name__ == '__main__':
    main()
