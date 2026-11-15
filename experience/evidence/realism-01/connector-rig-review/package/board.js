const response = await fetch(new URL('review-data.json', import.meta.url));
if (!response.ok) throw new Error(`Review data returned ${response.status}`);
const data = await response.json();
if (data.schemaVersion !== 1 || data.methods.length !== 4 || data.photographs.length !== 3 || data.denseSources.photographs.length !== 4) {
  throw new Error('Reviewed camera comparison requires four trials and both source sets');
}

function text(selector, value) {
  document.querySelector(selector).textContent = value;
}
function node(tag, value, className) {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = value;
  if (className) element.className = className;
  return element;
}
function measures(selector, values) {
  for (const { label, value } of values) {
    const group = node('div');
    group.append(node('dt', label), node('dd', value));
    document.querySelector(selector).append(group);
  }
}
text('#review-date', data.date);
text('#finding-title', data.finding.title);
text('#finding-description', data.finding.description);
measures('#measures', data.finding.measures);
for (const method of data.methods) {
  const row = node('tr', undefined, method.latest ? 'latest' : undefined);
  row.dataset.method = method.id;
  for (const value of [method.title, method.sourcePositions, method.constraints, method.result]) row.append(node('td', value));
  document.querySelector('#methods').append(row);
}
document.querySelector('#rig-figure').src = data.rigFigure.path;
text('#rig-caption', data.rigFigure.caption);
document.querySelector('#coverage-figure').src = data.coverage.figure;
text('#coverage-description', data.coverage.description);
text('#coverage-caption', data.coverage.caption);
measures('#coverage-measures', data.coverage.measures);
document.querySelector('#dense-sources-figure').src = data.denseSources.figure;
text('#dense-sources-caption', data.denseSources.caption);
for (const source of data.denseSources.photographs) {
  const item = node('li');
  const original = node('a', `Position ${source.rank} photograph`);
  original.href = source.path;
  const record = node('a', 'Source record');
  record.href = source.source;
  item.append(original, document.createTextNode(' · '), record);
  document.querySelector('#dense-source-links').append(item);
}
for (const photograph of data.photographs) {
  const figure = node('figure');
  figure.dataset.sourcePhoto = photograph.id;
  const image = node('img');
  image.src = photograph.path;
  image.alt = photograph.alt;
  const caption = node('figcaption');
  caption.append(node('span', photograph.label, 'photo-label'));
  caption.append(document.createTextNode(`${photograph.attribution} · ${photograph.license} · ${photograph.date} · `));
  const source = node('a', 'Source');
  source.href = photograph.source;
  caption.append(source, node('p', photograph.note));
  figure.append(image, caption);
  document.querySelector('#photographs').append(figure);
}
for (const item of data.nextSteps) document.querySelector('#next-steps').append(node('li', item));
for (const link of data.evidence) {
  const item = node('li');
  const anchor = node('a', link.label);
  anchor.href = link.path;
  item.append(anchor);
  document.querySelector('#evidence-links').append(item);
}
document.documentElement.dataset.reviewReady = 'true';
