// JSON-LD 结构化数据（schema.org）：让搜索引擎与 AI 抓取器读懂「这页是什么、谁写的、何时写的」。
// 只产出纯对象，由 SEO.astro 序列化进 <script type="application/ld+json">。
import { AUTHOR, CANONICAL_ORIGIN, SITE_DESCRIPTION, SITE_LANG, SITE_NAME, SITE_NAME_EN } from './site.mjs';

const WEBSITE_ID = `${CANONICAL_ORIGIN}/#website`;
const PERSON_ID = `${CANONICAL_ORIGIN}/#person`;

export function personLd() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: AUTHOR.name,
    url: AUTHOR.url,
    sameAs: AUTHOR.sameAs,
  };
}

export function websiteLd() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${CANONICAL_ORIGIN}/`,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANG,
    publisher: { '@id': PERSON_ID },
  };
}

// crumbs: [{ name, url }]，url 为绝对地址；最后一项是当前页
export function breadcrumbLd(crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

// 文章：笔记用 TechArticle 以外的通用 BlogPosting（搜索引擎支持面最广），快讯单期用 NewsArticle
export function articleLd({ type = 'BlogPosting', url, title, description, published, updated, section, tags = [], image }) {
  const ld = {
    '@type': type,
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: title,
    inLanguage: SITE_LANG,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
  };
  if (description) ld.description = description;
  if (published) ld.datePublished = published;
  if (updated || published) ld.dateModified = updated || published;
  if (section) ld.articleSection = section;
  if (tags.length) ld.keywords = tags.join(', ');
  if (image) ld.image = image;
  return ld;
}

// 把若干节点收进一个 @graph，站点与作者节点每页都带上，供 @id 引用
export function graph(nodes) {
  return {
    '@context': 'https://schema.org',
    '@graph': [websiteLd(), personLd(), ...nodes.filter(Boolean)],
  };
}

// 序列化进 <script>：转义 <，防止正文里的 </script> 提前闭合标签
export function serializeLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
