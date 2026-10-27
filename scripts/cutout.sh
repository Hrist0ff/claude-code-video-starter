#!/bin/sh
# Pass 02 cut-out: the speaker on a transparent background, so words can sit behind
# the head. macOS only (Apple Vision). Run it on an SDR copy at the reel's frame
# rate, not on an HDR phone original.
# Usage: scripts/cutout.sh <sdr-clip.mp4> <out.webm>
set -eu
[ $# -eq 2 ] || { echo "Usage: $0 <sdr-clip.mp4> <out.webm>" >&2; exit 1; }
size=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$1")
fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$1")
# The small blur softens the matte edge: no hard sticker outline.
swift "$(dirname "$0")/cutout.swift" "$1" |
  ffmpeg -v error -y -i "$1" -f rawvideo -pix_fmt gray -video_size "$size" -framerate "$fps" -i - \
    -filter_complex "[1]gblur=sigma=1.5[matte];[0][matte]alphamerge" \
    -an -c:v libvpx-vp9 -pix_fmt yuva420p -crf 28 -b:v 0 "$2"
echo "Wrote $2"
