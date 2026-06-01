export type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
  documentIds?: string[];
};

export const folderTree: FolderNode = {
  id: "root",
  name: "전체 문서",
  children: [
    {
      id: "ops",
      name: "운영",
      children: [
        { id: "ops-manual", name: "매뉴얼", documentIds: ["doc-1", "doc-5"] },
        { id: "ops-project", name: "프로젝트", documentIds: ["doc-4"] }
      ]
    },
    {
      id: "meeting",
      name: "회의",
      children: [
        { id: "meeting-weekly", name: "주간회의", documentIds: ["doc-2"] },
        { id: "education", name: "교육", documentIds: ["doc-3"] }
      ]
    }
  ]
};

export function findFolderById(node: FolderNode, id: string): FolderNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findFolderById(child, id);
    if (found) return found;
  }
  return null;
}

export function collectFolderDocumentIds(node: FolderNode): string[] {
  const ids = [...(node.documentIds ?? [])];
  for (const child of node.children ?? []) ids.push(...collectFolderDocumentIds(child));
  return ids;
}

export function addFolderToTree(node: FolderNode, parentId: string, folderName: string): FolderNode {
  if (node.id === parentId) {
    const nextChild: FolderNode = {
      id: `folder-${Date.now()}`,
      name: folderName,
      children: [],
      documentIds: [],
    };
    return { ...node, children: [...(node.children ?? []), nextChild] };
  }
  return {
    ...node,
    children: (node.children ?? []).map((child) => addFolderToTree(child, parentId, folderName)),
  };
}

export function renameFolderInTree(node: FolderNode, folderId: string, folderName: string): FolderNode {
  if (node.id === folderId) return { ...node, name: folderName };
  return {
    ...node,
    children: (node.children ?? []).map((child) => renameFolderInTree(child, folderId, folderName)),
  };
}

export function removeFolderFromTree(node: FolderNode, folderId: string): FolderNode {
  return {
    ...node,
    children: (node.children ?? [])
      .filter((child) => child.id !== folderId)
      .map((child) => removeFolderFromTree(child, folderId)),
  };
}

export function collectDescendantIds(node: FolderNode): string[] {
  const ids: string[] = [];
  for (const child of node.children ?? []) {
    ids.push(child.id, ...collectDescendantIds(child));
  }
  return ids;
}

function detachNode(node: FolderNode, targetId: string): { tree: FolderNode; detached: FolderNode | null } {
  let detached: FolderNode | null = null;
  const children: FolderNode[] = [];
  for (const child of node.children ?? []) {
    if (child.id === targetId) {
      detached = child;
      continue;
    }
    const result = detachNode(child, targetId);
    if (result.detached) detached = result.detached;
    children.push(result.tree);
  }
  return { tree: { ...node, children }, detached };
}

function attachNode(node: FolderNode, parentId: string, childNode: FolderNode): FolderNode {
  if (node.id === parentId) return { ...node, children: [...(node.children ?? []), childNode] };
  return { ...node, children: (node.children ?? []).map((child) => attachNode(child, parentId, childNode)) };
}

export function moveFolderInTree(node: FolderNode, sourceId: string, targetId: string): FolderNode {
  if (sourceId === "root" || sourceId === targetId) return node;
  const sourceNode = findFolderById(node, sourceId);
  if (!sourceNode) return node;
  const descendantIds = collectDescendantIds(sourceNode);
  if (descendantIds.includes(targetId)) return node;
  const detached = detachNode(node, sourceId);
  if (!detached.detached) return node;
  return attachNode(detached.tree, targetId, detached.detached);
}
