#!/usr/bin/env python
import sys

current = None
total = 0

for line in sys.stdin:
    parts = line.strip().split("\t")
    if len(parts) != 2:
        continue
    word, count = parts[0], int(parts[1])
    if current == word:
        total += count
    else:
        if current is not None:
            print("{0}\t{1}".format(current, total))
        current = word
        total = count

if current is not None:
    print("{0}\t{1}".format(current, total))