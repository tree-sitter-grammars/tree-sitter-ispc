#!/usr/bin/env bash
# File       : extract_stdlib.sh
# Created    : Fri May 19 2023 17:14:02 (-0400)
# Author     : Fabian Wermelinger
# Description: Extract built-in standard library functions from stdlib.isph
# Copyright 2023 Fabian Wermelinger. All Rights Reserved.

if [[ $# -ne 1 ]]; then
    cat <<EOF
USAGE: $0 <path to ISPC stdlib dir>
EOF
    exit 1
fi

src=$1; shift
tmp=$(mktemp)

# standard library functions
stdlib_filter() {
    sed -n -r 's/^.*[\ ]([a-zA-Z][a-zA-Z0-9_]*)\s*\(.*$/"\1"/p'
}
cpp ${src}/include/stdlib.isph | tr ';' '\n' | stdlib_filter >${tmp}
cpp ${src}/include/amx.isph | tr '{' '\n' | stdlib_filter >>${tmp}
#
# missing
echo '"ISPCAlloc"' >>${tmp}
echo '"ISPCLaunch"' >>${tmp}
echo '"ISPCSync"' >>${tmp}
echo '"ISPCInstrument"' >>${tmp}
echo '"alloca"' >>${tmp}
echo '"assert"' >>${tmp}
echo '"invoke_sycl"' >>${tmp}
echo '"print"' >>${tmp}
cat ${tmp} | sort | uniq

# builtin and SVML
builtin_filter() {
    sed -n -r 's/^.*[\ ]([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*$/"\1"/p'
}
cpp ${src}/include/builtins.isph | tr ';' '\n' | builtin_filter >${tmp}
cpp ${src}/include/svml.isph | tr ';' '\n' | builtin_filter >>${tmp}
cat ${tmp} | sort | uniq

rm -f ${tmp}
