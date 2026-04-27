let offersData = [];
let couponsData = [];

const els = {
  searchInput: document.getElementById("searchInput"),
  ratingFilter: document.getElementById("ratingFilter"),
  maxPriceInput: document.getElementById("maxPriceInput"),
  storeFilter: document.getElementById("storeFilter"),
  sortBy: document.getElementById("sortBy"),
  fetchOffersBtn: document.getElementById("fetchOffersBtn"),
  showCouponsBtn: document.getElementById("showCouponsBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  resetBtn: document.getElementById("resetBtn"),
  offersTableBody: document.getElementById("offersTableBody"),
  offersEmpty: document.getElementById("offersEmpty"),
  couponsTableBody: document.getElementById("couponsTableBody"),
  couponsEmpty: document.getElementById("couponsEmpty"),
  couponsModal: document.getElementById("couponsModal"),
  closeCouponsBtn: document.getElementById("closeCouponsBtn"),
  statCount: document.getElementById("statCount"),
  statAvgPrice: document.getElementById("statAvgPrice"),
  statBestDiscount: document.getElementById("statBestDiscount"),
  statCoupons: document.getElementById("statCoupons"),
  resultsMeta: document.getElementById("resultsMeta"),
  activeFilterChip: document.getElementById("activeFilterChip"),
  dataStatus: document.getElementById("dataStatus")
};

function formatCurrency(value) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0
  }).format(value);
}

function getDiscountPercent(priceBefore, priceAfter) {
  if (!priceBefore || priceBefore <= 0) return 0;
  return Math.round(((priceBefore - priceAfter) / priceBefore) * 100);
}

function populateStoreFilter() {
  els.storeFilter.innerHTML = '<option value="all">كل المتاجر</option>';
  const stores = [...new Set(offersData.map(item => item.store))].sort((a, b) => a.localeCompare(b, "ar"));
  stores.forEach(store => {
    const option = document.createElement("option");
    option.value = store;
    option.textContent = store;
    els.storeFilter.appendChild(option);
  });
}

function getFilters() {
  return {
    search: els.searchInput.value.trim().toLowerCase(),
    minRating: Number(els.ratingFilter.value || 0),
    maxPrice: Number(els.maxPriceInput.value || 0),
    store: els.storeFilter.value,
    sortBy: els.sortBy.value
  };
}

function applyOfferFilters(data) {
  const filters = getFilters();

  let filtered = data.filter(item => {
    const searchPool = `${item.name} ${item.category} ${item.store}`.toLowerCase();
    const matchesSearch = !filters.search || searchPool.includes(filters.search);
    const matchesRating = item.rating >= filters.minRating;
    const matchesPrice = !filters.maxPrice || item.priceAfter <= filters.maxPrice;
    const matchesStore = filters.store === "all" || item.store === filters.store;

    return matchesSearch && matchesRating && matchesPrice && matchesStore;
  });

  filtered = filtered.map(item => ({
    ...item,
    discountPercent: getDiscountPercent(item.priceBefore, item.priceAfter)
  }));

  switch (filters.sortBy) {
    case "ratingDesc":
      filtered.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
      break;
    case "priceAsc":
      filtered.sort((a, b) => a.priceAfter - b.priceAfter);
      break;
    case "priceDesc":
      filtered.sort((a, b) => b.priceAfter - a.priceAfter);
      break;
    case "reviewsDesc":
      filtered.sort((a, b) => b.reviews - a.reviews);
      break;
    case "discountDesc":
    default:
      filtered.sort((a, b) => b.discountPercent - a.discountPercent || b.rating - a.rating);
      break;
  }

  return filtered;
}

function applyCouponFilters(data) {
  const filters = getFilters();
  const filteredStores = new Set(applyOfferFilters(offersData).map(item => item.store));

  return data.filter(coupon => {
    const searchOk =
      !filters.search ||
      coupon.store.toLowerCase().includes(filters.search) ||
      coupon.note.toLowerCase().includes(filters.search) ||
      coupon.discount.toLowerCase().includes(filters.search);

    const storeOk = filters.store === "all" ? filteredStores.has(coupon.store) : coupon.store === filters.store;
    return searchOk && storeOk;
  });
}

function renderOffers() {
  const filtered = applyOfferFilters(offersData);
  els.offersTableBody.innerHTML = "";
  els.offersEmpty.style.display = filtered.length ? "none" : "block";

  filtered.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="product-name">${item.name}</div>
        <div class="subtext">${item.category}</div>
      </td>
      <td><span class="chip">${item.store}</span></td>
      <td>${formatCurrency(item.priceBefore)}</td>
      <td><strong>${formatCurrency(item.priceAfter)}</strong></td>
      <td><span class="discount">${item.discountPercent}%</span></td>
      <td><span class="rating">⭐ ${item.rating.toFixed(1)}</span></td>
      <td><span class="reviews">${item.reviews.toLocaleString("ar-SA")} مراجعة</span></td>
      <td><a class="action-link" href="${item.url}" target="_blank" rel="noopener noreferrer">فتح في المتجر</a></td>
    `;
    els.offersTableBody.appendChild(tr);
  });

  updateStats(filtered);
  updateMeta(filtered);
}

function renderCoupons() {
  const filteredCoupons = applyCouponFilters(couponsData);
  els.couponsTableBody.innerHTML = "";
  els.couponsEmpty.style.display = filteredCoupons.length ? "none" : "block";

  filteredCoupons.forEach(coupon => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${coupon.store}</td>
      <td><span class="coupon-code">${coupon.code}</span></td>
      <td><span class="small-badge">${coupon.discount}</span></td>
      <td>${coupon.expiry}</td>
      <td><a class="action-link" href="${coupon.url}" target="_blank" rel="noopener noreferrer">فتح</a></td>
      <td>${coupon.note}</td>
    `;
    els.couponsTableBody.appendChild(tr);
  });

  els.statCoupons.textContent = filteredCoupons.length.toLocaleString("ar-SA");
}

function updateStats(filtered) {
  const count = filtered.length;
  const avgPrice = count ? Math.round(filtered.reduce((sum, item) => sum + item.priceAfter, 0) / count) : 0;
  const bestDiscount = count ? Math.max(...filtered.map(item => item.discountPercent)) : 0;

  els.statCount.textContent = count.toLocaleString("ar-SA");
  els.statAvgPrice.textContent = count ? formatCurrency(avgPrice) : "0 ر.س";
  els.statBestDiscount.textContent = `${bestDiscount}%`;
  els.statCoupons.textContent = applyCouponFilters(couponsData).length.toLocaleString("ar-SA");
}

function updateMeta(filtered) {
  const filters = getFilters();
  const active = [];

  if (filters.search) active.push(`البحث: ${filters.search}`);
  if (filters.minRating) active.push(`التقييم ≥ ${filters.minRating}`);
  if (filters.maxPrice) active.push(`السعر ≤ ${filters.maxPrice} ر.س`);
  if (filters.store !== "all") active.push(`المتجر: ${filters.store}`);

  els.activeFilterChip.textContent = active.length ? active.join(" • ") : "لا توجد فلاتر نشطة";

  if (!filtered.length) {
    els.resultsMeta.textContent = "لم يتم العثور على نتائج مطابقة. جرّب تخفيف الفلاتر أو البحث باسم مختلف.";
    return;
  }

  const top = filtered[0];
  els.resultsMeta.textContent =
    `تم العثور على ${filtered.length.toLocaleString("ar-SA")} نتيجة. أفضل نتيجة حاليًا: ${top.name} من متجر ${top.store} بسعر ${formatCurrency(top.priceAfter)} وخصم ${top.discountPercent}%.`;
}

function exportToCSV() {
  const filtered = applyOfferFilters(offersData);

  if (!filtered.length) {
    alert("لا توجد بيانات لتصديرها.");
    return;
  }

  const headers = ["المنتج", "الفئة", "المتجر", "السعر قبل", "السعر بعد", "الخصم %", "التقييم", "المراجعات", "الرابط"];
  const rows = filtered.map(item => [item.name, item.category, item.store, item.priceBefore, item.priceAfter, item.discountPercent, item.rating, item.reviews, item.url]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "offers-export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resetFilters() {
  els.searchInput.value = "";
  els.ratingFilter.value = "0";
  els.maxPriceInput.value = "";
  els.storeFilter.value = "all";
  els.sortBy.value = "discountDesc";
  renderOffers();
  renderCoupons();
}

function openCouponsModal() {
  renderCoupons();
  els.couponsModal.classList.add("show");
  els.couponsModal.setAttribute("aria-hidden", "false");
}

function closeCouponsModal() {
  els.couponsModal.classList.remove("show");
  els.couponsModal.setAttribute("aria-hidden", "true");
}

function bindEvents() {
  els.fetchOffersBtn.addEventListener("click", () => {
    renderOffers();
    renderCoupons();
  });

  els.showCouponsBtn.addEventListener("click", openCouponsModal);
  els.closeCouponsBtn.addEventListener("click", closeCouponsModal);
  els.exportCsvBtn.addEventListener("click", exportToCSV);
  els.resetBtn.addEventListener("click", resetFilters);

  [els.searchInput, els.ratingFilter, els.maxPriceInput, els.storeFilter, els.sortBy].forEach(el => {
    el.addEventListener("input", renderOffers);
    el.addEventListener("change", renderOffers);
  });

  els.couponsModal.addEventListener("click", e => {
    if (e.target === els.couponsModal) closeCouponsModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeCouponsModal();
  });
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`فشل تحميل الملف: ${url}`);
  return response.json();
}

async function initializeData() {
  try {
    els.resultsMeta.textContent = "جارٍ تحميل البيانات من ملفات JSON...";
    [offersData, couponsData] = await Promise.all([
      loadJson("offers.json"),
      loadJson("coupons.json")
    ]);

    populateStoreFilter();
    renderOffers();
    renderCoupons();
    els.dataStatus.textContent = `تم تحميل ${offersData.length.toLocaleString("ar-SA")} عرض و${couponsData.length.toLocaleString("ar-SA")} قسيمة من ملفات JSON بنجاح.`;
  } catch (error) {
    console.error(error);
    els.resultsMeta.textContent = "تعذر تحميل البيانات. شغّل المشروع عبر خادم محلي أو استضافة static بدل فتح الملف مباشرة من النظام.";
    els.dataStatus.textContent = "مهم: عند استخدام fetch مع JSON قد لا تعمل البيانات عند فتح index.html مباشرة عبر file:// في بعض المتصفحات. استخدم Live Server أو python -m http.server أو ارفعه إلى GitHub Pages / Netlify.";
    els.offersEmpty.style.display = "block";
    els.offersEmpty.textContent = "فشل تحميل البيانات من offers.json و coupons.json.";
  }
}

function init() {
  bindEvents();
  initializeData();
}

init();
