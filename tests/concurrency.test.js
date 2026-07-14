const { mapWithConcurrency } = require('../src/utils/concurrency');

describe('并发映射工具', () => {
  test('保持结果顺序且不超过并发上限', async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async value => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return value * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  test('空列表直接返回空结果', async () => {
    expect(await mapWithConcurrency([], 4, jest.fn())).toEqual([]);
  });
});
