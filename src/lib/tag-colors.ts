const TAG_COLORS = [
  "#8A9A7B",
  "#C4704F",
  "#C9A227",
  "#7C93B8",
  "#9B8AA6",
  "#D98A9E",
  "#6F9A8D",
  "#B08968",
  "#7F8C8D",
  "#A98467",
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export { TAG_COLORS };
