/**
 * 파일 역할: business-info 페이지의 업체 광고 프로필 목록/지역 필터 렌더링을 담당하는 스크립트 파일.
 */
const REGION_DISTRICT_MAP = {
    서울: ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    경기: ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
    인천: ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
    부산: ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
    대구: ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
    광주: ['광산구', '남구', '동구', '북구', '서구'],
    대전: ['대덕구', '동구', '서구', '유성구', '중구'],
    울산: ['남구', '동구', '북구', '울주군', '중구'],
    강원: ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
    경남: ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
    경북: ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
    전남: ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
    전북: ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
    충남: ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
    충북: ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청원군', '청주시', '충주시'],
    세종: ['세종시'],
    제주: ['서귀포시', '제주시']
};

function updateSelectOptions(selectElement, values, placeholder = '전체') {
    if (!selectElement) return;
    const options = [`<option value="">${placeholder}</option>`]
        .concat(values.map((value) => `<option value="${value}">${value}</option>`));
    selectElement.innerHTML = options.join('');
}

function renderBusinessAds(ads) {
    const list = document.getElementById('business-directory-list');
    const empty = document.getElementById('business-directory-empty');
    if (!list || !empty) return;

    if (!Array.isArray(ads) || !ads.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = ads.map((ad) => {
        const planType = String(ad.planType || 'NORMAL').toUpperCase() === 'PREMIUM' ? 'premium' : 'normal';
        const title = sanitizeHTML(ad.title || '업체정보');
        const regionDistrict = [ad.region, ad.district].filter(Boolean).map((value) => sanitizeHTML(value)).join(' ');
        const category = sanitizeHTML(ad.category || '업종 미지정');
        const summary = [regionDistrict, category].filter(Boolean).join(' · ');
        return `
            <li class="business-directory-item">
                <div class="business-directory-main">
                    <h4>${title}</h4>
                    <p>${summary}</p>
                </div>
                <span class="business-directory-tier business-directory-tier-${planType}">${planType === 'premium' ? '프리미엄' : '일반'}</span>
            </li>
        `;
    }).join('');
}

async function loadBusinessAds() {
    const region = String(document.getElementById('business-region-filter')?.value || '').trim();
    const district = String(document.getElementById('business-district-filter')?.value || '').trim();
    const category = String(document.getElementById('business-category-filter')?.value || '').trim();
    const keyword = String(document.getElementById('business-keyword-filter')?.value || '').trim();

    try {
        const response = await APIClient.get('/live/business-ads', { region, district, category, keyword });
        renderBusinessAds(Array.isArray(response?.content) ? response.content : []);
    } catch (error) {
        renderBusinessAds([]);
    }
}

function bindBusinessFilterEvents() {
    const regionSelect = document.getElementById('business-region-filter');
    const districtSelect = document.getElementById('business-district-filter');
    const categorySelect = document.getElementById('business-category-filter');
    const keywordInput = document.getElementById('business-keyword-filter');
    const applyButton = document.getElementById('business-filter-apply-btn');

    updateSelectOptions(regionSelect, Object.keys(REGION_DISTRICT_MAP));
    updateSelectOptions(categorySelect, ['룸', '바', '클럽', '기타']);

    regionSelect?.addEventListener('change', () => {
        const region = regionSelect.value;
        updateSelectOptions(districtSelect, REGION_DISTRICT_MAP[region] || []);
    });

    applyButton?.addEventListener('click', loadBusinessAds);
    keywordInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            loadBusinessAds();
        }
    });
}

async function initBusinessInfoPage() {
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    bindBusinessFilterEvents();
    await loadBusinessAds();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBusinessInfoPage, { once: true });
} else {
    initBusinessInfoPage();
}
