// サンプル企業データ：この配列に同じ形式で追加すると、地図とカードに自動反映されます。
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

const map = L.map('map', { scrollWheelZoom: false }).setView([35.12, 136.98], 9);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const markers = [];
const companyList = document.querySelector('#company-list');
document.querySelector('#company-count').textContent = companies.length;

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

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
    <a class="popup-link" href="${company.url}" target="_blank" rel="noopener noreferrer">参考URL（サンプル） ↗</a>
  `;

  const marker = L.marker([company.lat, company.lng], { icon: pinIcon, title: company.name })
    .addTo(map)
    .bindPopup(popup);
  markers.push(marker);

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
    document.querySelector('.map-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
