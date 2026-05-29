export const extractTextFromBlocks = (blocks: any[]): string => {
  const chunk: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === "string") chunk.push(node);
    if (Array.isArray(node)) node.forEach(walk);
    if (typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(blocks);
  return chunk.join(" ").replace(/\s+/g, " ").trim().slice(0, 3000);
};
