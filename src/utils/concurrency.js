async function mapWithConcurrency(items, limit, mapper) {
  if (!Array.isArray(items)) {
    throw new TypeError('items 必须是数组');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError('并发上限必须是正整数');
  }
  if (typeof mapper !== 'function') {
    throw new TypeError('mapper 必须是函数');
  }
  if (items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

module.exports = { mapWithConcurrency };
