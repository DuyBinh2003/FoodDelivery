import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

function requireSearchUrl(): string {
  const directUrl = process.env.SEARCH_SERVICE_URL;
  if (directUrl && directUrl.trim() !== '') {
    return directUrl.trim().replace(/\/$/, '');
  }
  const gatewayUrl = process.env.PUBLIC_GATEWAY_URL;
  if (gatewayUrl && gatewayUrl.trim() !== '') {
    return `${gatewayUrl.trim().replace(/\/$/, '')}`;
  }
  throw new Error(
    '[ConfigError] Thiếu biến môi trường SEARCH_SERVICE_URL hoặc PUBLIC_GATEWAY_URL trong backend/.env.',
  );
}

async function runSearchPerformanceBenchmark(): Promise<void> {
  const baseUrl = requireSearchUrl();
  console.log(`\n================================================================`);
  console.log(`⚡ BENCHMARK HIỆU NĂNG TÌM KIẾM (${baseUrl})`);
  console.log(`================================================================\n`);

  // 1. Vietnamese Full-Text Search (Có dấu & Không dấu)
  console.log('📊 TEST 1: Vietnamese Full-Text Search (Có dấu vs Không dấu)...');
  const testQueries = ['com tam', 'cơm tấm sườn', 'tra sua tran chau', 'pho bo', 'bun bo hue', 'pizza'];

  for (const q of testQueries) {
    const t0 = performance.now();
    const res = await fetch(`${baseUrl}/search/menu?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      throw new Error(`Search menu failed (${res.status}) for query "${q}"`);
    }
    const data = (await res.json()) as unknown;
    const duration = performance.now() - t0;
    console.log(
      `   - Query: "${q}" -> Kết quả: ${Array.isArray(data) ? data.length : 0} nhà hàng, Latency: ${duration.toFixed(2)}ms`,
    );
  }

  // 2. Multi-Factor Geo-Relevance Ranking
  console.log('\n📊 TEST 2: Multi-Factor Geo-Relevance Ranking (Gauss Decay + Rating Factor)...');
  const geoQueries = [
    { q: 'cơm', lat: 10.7725, lon: 106.7027, radius: '5km', sort: 'relevance' },
    { q: 'trà sữa', lat: 10.7816, lon: 106.6908, radius: '10km', sort: 'relevance' },
    { q: 'phở', lat: 10.75, lon: 106.68, radius: '3km', sort: 'distance' },
  ];

  for (const g of geoQueries) {
    const t0 = performance.now();
    const res = await fetch(
      `${baseUrl}/search/restaurants?q=${encodeURIComponent(g.q)}&lat=${g.lat}&lon=${g.lon}&radius=${g.radius}&sort_by=${g.sort}`,
    );
    if (!res.ok) {
      throw new Error(`Search restaurants failed (${res.status}) for query "${g.q}"`);
    }
    const data = (await res.json()) as unknown;
    const duration = performance.now() - t0;
    console.log(
      `   - Query: "${g.q}" @ (${g.lat}, ${g.lon}) bán kính ${g.radius} -> ${Array.isArray(data) ? data.length : 0} quán, Latency: ${duration.toFixed(2)}ms`,
    );
  }

  // 3. Concurrent Autocomplete Suggestions (100 concurrent requests)
  console.log('\n📊 TEST 3: Concurrent Autocomplete Suggestions (100 concurrent requests)...');
  const keystrokes = ['ph', 'pho', 'tra', 'tra s', 'com', 'com t', 'bun', 'bun b', 'ga', 'ca phe'];
  const concurrentRequests = 100;
  const tStartConcurrent = performance.now();

  const promises: Array<Promise<number>> = [];
  for (let i = 0; i < concurrentRequests; i++) {
    const kw = keystrokes[i % keystrokes.length]!;
    promises.push(
      (async () => {
        const reqStart = performance.now();
        const r = await fetch(
          `${baseUrl}/search/suggestions?q=${encodeURIComponent(kw)}&lat=10.77&lon=106.70`,
        );
        if (!r.ok) {
          throw new Error(`Suggestions failed (${r.status}) for keyword "${kw}"`);
        }
        await r.json();
        return performance.now() - reqStart;
      })(),
    );
  }

  const suggestionLatencies = await Promise.all(promises);
  const totalConcurrentDuration = performance.now() - tStartConcurrent;

  suggestionLatencies.sort((a, b) => a - b);
  const p50 = (suggestionLatencies[Math.floor(suggestionLatencies.length * 0.5)] ?? 0).toFixed(2);
  const p95 = (suggestionLatencies[Math.floor(suggestionLatencies.length * 0.95)] ?? 0).toFixed(2);
  const p99 = (suggestionLatencies[Math.floor(suggestionLatencies.length * 0.99)] ?? 0).toFixed(2);
  const rps = ((concurrentRequests / totalConcurrentDuration) * 1000).toFixed(1);

  console.log(`   ✔ Hoàn tất 100 requests đồng thời trong: ${totalConcurrentDuration.toFixed(2)}ms`);
  console.log(`   ✔ Throughput: ${rps} requests/second`);
  console.log(`   ✔ P50 Latency: ${p50}ms`);
  console.log(`   ✔ P95 Latency: ${p95}ms`);
  console.log(`   ✔ P99 Latency: ${p99}ms\n`);
}

runSearchPerformanceBenchmark().catch((error: unknown) => {
  console.error('❌ [BenchmarkError]:', error);
  process.exit(1);
});
