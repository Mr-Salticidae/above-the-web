// 公开学习路径与 DM 阅读器共用的纯路由逻辑。
// 只认稳定的 case/module/doc ID，不认仓库地址；DOM 与网络都留在页面层。

export function missionAt(caseData, slug) {
  if (!caseData?.modules?.length) return null;
  const index = Math.max(0, caseData.modules.findIndex((module) => module.slug === slug));
  return { module: caseData.modules[index], index };
}

export function firstOpenMission(caseData, isDone = () => false) {
  if (!caseData?.modules?.length) return null;
  const index = caseData.modules.findIndex((module) => !isDone(caseData.id, module.slug));
  return missionAt(caseData, caseData.modules[index < 0 ? 0 : index].slug);
}

export function nextMission(caseData, slug) {
  const current = missionAt(caseData, slug);
  if (!current || current.index >= caseData.modules.length - 1) return null;
  return missionAt(caseData, caseData.modules[current.index + 1].slug);
}

export function missionHref(base, caseId, moduleSlug) {
  const root = String(base || '/');
  const joiner = root.includes('?') ? '&' : '?';
  return `${root}${joiner}case=${encodeURIComponent(caseId)}&module=${encodeURIComponent(moduleSlug)}#dm-vault`;
}

export function vaultDocList(manifestCase) {
  if (!manifestCase) return [];
  if (Array.isArray(manifestCase.groups)) return manifestCase.groups.flatMap((group) => group.docs || []);
  return Array.isArray(manifestCase.docs) ? manifestCase.docs : [];
}

// 将公开训练目标解析成私有清单里的真实文档。清单缺这篇时退回首篇并明确标记，
// 不伪造 URL，也不让 DM 对着一个永远打不开的按钮猜原因。
export function resolveVaultMission(cases, manifestCases, caseId, moduleSlug) {
  const publicCase = cases.find((item) => item.id === caseId || item.vaultCaseId === caseId) || cases[0];
  if (!publicCase) return null;
  const mission = missionAt(publicCase, moduleSlug);
  const manifestCase = manifestCases.find((item) => item.id === publicCase.vaultCaseId);
  const docs = vaultDocList(manifestCase);
  const requestedDoc = mission?.module.docId;
  const docId = docs.some((doc) => doc.id === requestedDoc) ? requestedDoc : docs[0]?.id || null;
  return {
    publicCase,
    mission,
    manifestCase: manifestCase || null,
    vaultCaseId: manifestCase?.id || publicCase.vaultCaseId,
    docId,
    docMissing: Boolean(requestedDoc && requestedDoc !== docId),
  };
}
