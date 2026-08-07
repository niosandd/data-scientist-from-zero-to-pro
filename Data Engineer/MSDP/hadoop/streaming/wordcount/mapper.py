#!/usr/bin/env python
import sys

for line in sys.stdin:
    for word in line.strip().split():
        if word:
            print("{0}\t1".format(word.lower()))