// Apps Scriptをデプロイした後、「ウェブアプリのURL（/execで終わるURL）」に置き換えてください。
const GAS_ENDPOINT_URL = "https://script.google.com/a/macros/m.chukyo-u.ac.jp/s/AKfycbzJy6tbzPKxjqFN7caHWHaa6ISvAu8J10NgB1hpbNTpGQxaZlWXmxu-fYaewv4gpLzv/exec";

// 集計機能の安全設定（企業マップとは独立して動作します）。
const SURVEY_CACHE_KEY = "greenActionMapSurveyStatsV1";
const SURVEY_SUBMITTED_KEY = "greenActionMapSurveySubmittedV1";
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 12 * 1000;

// この配列に同じ形式で企業を追加すると、地図とカードへ自動反映されます。
const companies = [
  {
    name: 'あおば未来テクノロジー株式会社（サンプル）',
    shortName: 'あおば未来テクノロジー',
    location: '愛知県名古屋市中区（サンプル所在地）',
    lat: 35.1685,
    lng: 136.9066,
    action: '本社オフィスで使用する電力の一部に相当するグリーン電力証書を活用し、環境学習イベントも実施しています。（サンプル内容）',
    url: 'https://example.com/aoba'
  },
  {
    name: 'みかわエコフーズ株式会社（サンプル）',
    shortName: 'みかわエコフーズ',
    location: '愛知県岡崎市（サンプル所在地）',
    lat: 34.9543,
    lng: 137.1744,
    action: '商品の製造工程で使用する電力の環境価値をグリーン電力証書で補い、店頭で取り組みを紹介しています。（サンプル内容）',
    url: 'https://example.com/mikawa'
  },
  {
    name: '尾張グリーンデザイン合同会社（サンプル）',
    shortName: '尾張グリーンデザイン',
    location: '愛知県一宮市（サンプル所在地）',
    lat: 35.3039,
    lng: 136.8028,
    action: '自社イベントの使用電力にグリーン電力証書を活用し、地域の学生向けに再生可能エネルギー講座を開いています。（サンプル内容）',
    url: 'https://example.com/owari'
  }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function initializeCompanyMap() {
  const mapElement = document.querySelector('#map');
  const companyList = document.querySelector('#company-list');
  const companyCount = document.querySelector('#company-count');

  if (companyCount) companyCount.textContent = companies.length;
  if (!mapElement || !companyList || typeof L === 'undefined') return;

  const map = L.map(mapElement, { scrollWheelZoom: false }).setView([35.12, 136.98], 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  companies.forEach((company, index) => {
    const pinIcon = L.divIcon({
      className: '',
      html: `<div class="custom-pin"><span>${index + 1}</span></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -35]
    });

    const popup = `
      <div class="popup-label">SAMPLE COMPANY</div>
      <h3 class="popup-title">${escapeHtml(company.name)}</h3>
      <p class="popup-address">所在地：${escapeHtml(company.location)}</p>
      <p class="popup-action">${escapeHtml(company.action)}</p>
      <a class="popup-link" href="${escapeHtml(company.url)}" target="_blank" rel="noopener noreferrer">参考URL（サンプル） ↗</a>
    `;

    const marker = L.marker([company.lat, company.lng], { icon: pinIcon, title: company.name })
      .addTo(map)
      .bindPopup(popup);

    const card = document.createElement('article');
    card.className = 'company-card';
    card.tabIndex = 0;
    card.setAttribute('aria-label', `${company.name}を地図で見る`);
    card.innerHTML = `
      <div class="card-top"><span class="card-number">0${index + 1}</span><span class="sample-tag">架空のサンプル</span></div>
      <h3>${escapeHtml(company.shortName)}</h3>
      <p class="card-location">● ${escapeHtml(company.location)}</p>
      <p class="card-action">${escapeHtml(company.action)}</p>
      <div class="card-footer"><span>地図で詳しく見る</span><span class="card-arrow" aria-hidden="true">→</span></div>
    `;

    const showOnMap = () => {
      map.flyTo([company.lat, company.lng], 12, { duration: .8 });
      marker.openPopup();
      document.querySelector('.map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    card.addEventListener('click', showOnMap);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showOnMap();
      }
    });
    companyList.appendChild(card);
  });

  window.addEventListener('resize', () => map.invalidateSize());
}

// 地図でエラーが起きても、ページの残りの部分を止めません。
try {
  initializeCompanyMap();
} catch (error) {
  console.error('企業マップを初期化できませんでした。', error);
}

function initializeLiveSurvey() {
  const form = document.querySelector('#awareness-form');
  const submitButton = document.querySelector('#survey-submit');
  const surveyMessage = document.querySelector('#survey-message');
  const refreshButton = document.querySelector('#refresh-results');
  const resultsMessage = document.querySelector('#results-message');
  const resultsDataNote = document.querySelector('#results-data-note');
  const totalCount = document.querySelector('#total-count');
  const knownPercent = document.querySelector('#known-percent');
  const unknownPercent = document.querySelector('#unknown-percent');

  if (!form || !submitButton || !surveyMessage || !resultsMessage || !totalCount || !knownPercent || !unknownPercent) return;

  let lastFetchTime = 0;
  let isFetching = false;
  let isSubmitting = false;
  let latestStats = null;

  const endpointIsConfigured = () => (
    typeof GAS_ENDPOINT_URL === 'string' &&
    GAS_ENDPOINT_URL.startsWith('https://script.google.com/macros/s/') &&
    GAS_ENDPOINT_URL.endsWith('/exec')
  );

  const setSurveyMessage = (message, isError = false) => {
    surveyMessage.textContent = message;
    surveyMessage.classList.toggle('error', isError);
  };

  const setResultsMessage = (message, isError = false) => {
    resultsMessage.textContent = message;
    resultsMessage.classList.toggle('error', isError);
  };

  const normalizeStats = data => {
    const total = Number(data?.total);
    const known = Number(data?.knownPercent);
    const unknown = Number(data?.unknownPercent);
    if (![total, known, unknown].every(Number.isFinite)) throw new Error('Invalid aggregate response');
    if (total < 0 || known < 0 || known > 100 || unknown < 0 || unknown > 100) throw new Error('Out-of-range aggregate response');
    return { total: Math.round(total), knownPercent: Math.round(known), unknownPercent: Math.round(unknown) };
  };

  const renderStats = (stats, isCached = false) => {
    latestStats = stats;
    totalCount.textContent = stats.total;
    knownPercent.textContent = `${stats.knownPercent}%`;
    unknownPercent.textContent = `${stats.unknownPercent}%`;
    if (resultsDataNote) resultsDataNote.hidden = !isCached;
  };

  const saveStats = stats => {
    try {
      localStorage.setItem(SURVEY_CACHE_KEY, JSON.stringify({ ...stats, savedAt: Date.now() }));
    } catch (error) {
      console.warn('集計のローカル保存を利用できません。', error);
    }
  };

  const loadCachedStats = () => {
    try {
      const cached = localStorage.getItem(SURVEY_CACHE_KEY);
      if (!cached) return false;
      renderStats(normalizeStats(JSON.parse(cached)), true);
      return true;
    } catch (error) {
      console.warn('前回の集計データを読み込めません。', error);
      return false;
    }
  };

  const showResultsError = () => {
    if (latestStats) {
      renderStats(latestStats, true);
    } else if (!loadCachedStats()) {
      totalCount.textContent = '--';
      knownPercent.textContent = '--%';
      unknownPercent.textContent = '--%';
    }
    setResultsMessage('集計を読み込めませんでした', true);
  };

  const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const requestStatsWithJsonp = url => new Promise((resolve, reject) => {
    const callbackName = `__greenActionMapStats_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      script.remove();
      try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timed out'));
    }, REQUEST_TIMEOUT_MS);

    window[callbackName] = data => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
    script.async = true;
    document.head.appendChild(script);
  });

  const fetchStats = async ({ manual = false } = {}) => {
    if (!endpointIsConfigured()) {
      showResultsError();
      return;
    }
    if (isFetching) return;

    const now = Date.now();
    const elapsed = now - lastFetchTime;
    if (lastFetchTime && elapsed < MIN_REFRESH_INTERVAL_MS) {
      if (manual) setResultsMessage(`${Math.ceil((MIN_REFRESH_INTERVAL_MS - elapsed) / 1000)}秒後に再読み込みできます`);
      return;
    }

    isFetching = true;
    lastFetchTime = now;
    if (refreshButton) refreshButton.disabled = true;
    setResultsMessage('集計を読み込んでいます…');

    try {
      const stats = normalizeStats(await requestStatsWithJsonp(GAS_ENDPOINT_URL));
      renderStats(stats, false);
      saveStats(stats);
      setResultsMessage('最新の集計です');
    } catch (error) {
      console.error('集計取得に失敗しました。', error);
      showResultsError();
    } finally {
      isFetching = false;
      if (refreshButton) refreshButton.disabled = false;
    }
  };

  const disableAnsweredForm = () => {
    form.querySelectorAll('input, button').forEach(element => { element.disabled = true; });
    setSurveyMessage('ご回答ありがとうございます');
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (isSubmitting) return;

    const answer = new FormData(form).get('answer');
    if (answer !== '知っていた' && answer !== '知らなかった') {
      setSurveyMessage('回答を選択してください', true);
      return;
    }
    if (!endpointIsConfigured()) {
      setSurveyMessage('送信できませんでした。時間をおいて再度お試しください', true);
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    setSurveyMessage('送信しています…');

    try {
      const response = await fetchWithTimeout(GAS_ENDPOINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ answer, userAgent: navigator.userAgent.slice(0, 500) }),
        mode: 'no-cors',
        cache: 'no-store',
        redirect: 'follow'
      });
      // no-cors応答はopaque（内容を読めない）です。ネットワーク送信に失敗した場合はcatchへ進みます。
      if (response.type !== 'opaque' && !response.ok) throw new Error(`HTTP ${response.status}`);

      try { localStorage.setItem(SURVEY_SUBMITTED_KEY, 'true'); } catch (error) { console.warn(error); }
      disableAnsweredForm();

      // 定期ポーリングは行わず、回答後の更新も30秒以上空けて1回だけ行います。
      window.setTimeout(() => fetchStats(), MIN_REFRESH_INTERVAL_MS);
    } catch (error) {
      console.error('回答送信に失敗しました。', error);
      setSurveyMessage('送信できませんでした。時間をおいて再度お試しください', true);
      submitButton.disabled = false;
    } finally {
      isSubmitting = false;
    }
  });

  refreshButton?.addEventListener('click', () => fetchStats({ manual: true }));

  try {
    if (localStorage.getItem(SURVEY_SUBMITTED_KEY) === 'true') disableAnsweredForm();
  } catch (error) {
    console.warn('回答済み状態を確認できません。', error);
  }

  loadCachedStats();
  fetchStats(); // 初回表示時の取得はこの1回だけです。
}

// 集計APIに障害があっても、企業マップやGoogleフォームへの導線には影響しません。
try {
  initializeLiveSurvey();
} catch (error) {
  console.error('リアルタイム集計機能を初期化できませんでした。', error);
  const resultsMessage = document.querySelector('#results-message');
  if (resultsMessage) {
    resultsMessage.textContent = '集計を読み込めませんでした';
    resultsMessage.classList.add('error');
  }
}
