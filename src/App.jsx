import { useEffect, useMemo, useState } from "react";
import { apiRequest, setCsrfToken } from "./api.js";

const HUBS = [
  ["Kariakoo Hub", "Dar es Salaam (Kariakoo Hub)"],
  ["Kigamboni Stand 12", "Dar es Salaam (Kigamboni Stand 12)"],
  ["Ilala Market", "Dar es Salaam (Ilala Market)"],
  ["Mbeya Central", "Mbeya (Soko Kuu)"],
  ["Arusha Central", "Arusha (Kilombero Market)"],
];

const TRANSLATIONS = {
  sw: {
    tagline: "Ukusanyaji na Usafirishaji wa Bidhaa za Masoko",
    hub: "Kituo:",
    catalog: "Masoko",
    pooling: "Ukusanyaji",
    dispatch: "Dereva",
    admin: "Usimamizi (Admin)",
    account: "Akaunti",
    cart: "Kikapu",
    activePool: "Kundi la Ununuzi Kigamboni Liko Hai!",
    poolDescription: "Jiunge na oda za pamoja ili kupata punguzo la ununuzi wa jumla.",
    viewPool: "Tazama Ukusanyaji",
    quality: "Bidhaa zenye ubora uliothibitishwa kwenda sokoni kwako",
    poolTag: "Ukusanyaji Unaoendelea",
    poolDesc: "Wafanyabiashara wanajumuisha oda ili kufikisha lengo la uzito na kupata bei ya jumla.",
    remaining: "Muda Uliobaki:",
    target: "Lengo la Punguzo:",
    joinPool: "Jiunge na Ukusanyaji Huu",
    browse: "Chagua Bidhaa Masokoni",
    liveFeed: "Shughuli za hivi karibuni kwenye kundi",
    driverArea: "Eneo la Dereva Bodaboda / Bajaji",
    dispatchTitle: "Orodha ya Mizigo na Usafirishaji",
    pickup: "Kituo cha Kuchukua:",
    dropoff: "Kituo cha Kushusha:",
    deliveryWindow: "Muda wa Kushusha:",
    manifest: "Orodha ya Oda za Wafanyabiashara kwenye Njia Hii",
    creditLimit: "Kikomo cha Mkopo wa Soko",
    creditScore: "Kiwango cha Uaminifu:",
    creditTip: "Lipa oda zako kupitia M-Pesa kwa wakati ili kuongeza kikomo chako cha mkopo wa bidhaa kila mwezi.",
    orderHistory: "Oda Zangu",
    reset: "Suka Data Upya",
    subtotal: "Jumla ya Bidhaa:",
    weight: "Uzito Wote:",
    deliveryFee: "Gharama ya Bodaboda:",
    discount: "Punguzo la Ukusanyaji:",
    total: "Jumla Kuu:",
    poolToggle: "Jiunge na Ukusanyaji wa Kigamboni",
    deliverySlot: "Muda wa Kupokea Asubuhi:",
    payment: "Njia ya Kulipia:",
    paymentPhone: "Namba ya Simu ya Malipo:",
    checkout: "Kamilisha Oda na Lipa",
    logout: "Toka kwenye akaunti",
    login: "Ingia",
    register: "Jisajili",
    adminPortal: "Usimamizi Mkuu wa Mfumo",
    adminDesc: "Hakiki watumiaji, badilisha majukumu, na dhibiti akaunti za mfumo.",
    userManagement: "Orodha na Usimamizi wa Akaunti za Watumiaji",
  },
  en: {
    tagline: "Market Goods Group Aggregation & Micro-Logistics",
    hub: "Hub:",
    catalog: "Catalog",
    pooling: "Group Pool",
    dispatch: "Driver",
    admin: "Admin Portal",
    account: "Account & Credit",
    cart: "Cart",
    activePool: "Kigamboni Buying Pool is Active!",
    poolDescription: "Join today's pooled orders to get the configured bulk-buying discount.",
    viewPool: "View Pool",
    quality: "Guaranteed produce quality directly to your stall",
    poolTag: "Active Group Pool",
    poolDesc: "Local vendors pool daily orders to hit bulk weight targets and trigger discounts.",
    remaining: "Time Remaining:",
    target: "Discount Target:",
    joinPool: "Join This Group Pool",
    browse: "Browse Wholesale Market",
    liveFeed: "Recent Group Order Activity",
    driverArea: "Bodaboda / Bajaji Driver Portal",
    dispatchTitle: "Delivery Manifest & Logistics",
    pickup: "Pickup Location:",
    dropoff: "Drop-off Location:",
    deliveryWindow: "Delivery Window:",
    manifest: "Vendor Order Packages on Route",
    creditLimit: "Mkopo wa Soko Credit Limit",
    creditScore: "Trust Score Rating:",
    creditTip: "Pay your orders via M-Pesa on time to continuously unlock higher credit limits.",
    orderHistory: "My Order History",
    reset: "Reset App Data",
    subtotal: "Items Subtotal:",
    weight: "Total Weight:",
    deliveryFee: "Bodaboda Delivery Fee:",
    discount: "Group Discount:",
    total: "Grand Total:",
    poolToggle: "Join Kigamboni Ward Pool",
    deliverySlot: "Morning Delivery Time Slot:",
    payment: "Payment Method:",
    paymentPhone: "Payment Phone Number:",
    checkout: "Complete Order & Pay",
    logout: "Log Out",
    login: "Log In",
    register: "Register",
    adminPortal: "System Administration",
    adminDesc: "Approve users, manage roles, and control account permissions.",
    userManagement: "User Account Directory & Permissions",
  },
};

const CATEGORIES = ["All", "Grains", "Vegetables", "Cooking Oil", "Poultry"];
const formatMoney = (amount) => `TZS ${Number(amount || 0).toLocaleString()}`;

function loadStored(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error);
    return fallback;
  }
}

function Icon({ name, className = "" }) {
  return <i aria-hidden="true" className={`fa-solid ${name} ${className}`} />;
}

function App() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState(() => loadStored("sokosafi_cart", []));
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({
    deliveryFeeTZS: 3000,
    poolingDiscountPercent: 15,
    poolingTargetKg: 500,
    poolingCutoffHour: 21,
    defaultHub: "Kariakoo Hub",
  });
  const [poolingInfo, setPoolingInfo] = useState({ currentKg: 0, activity: [] });
  const [language, setLanguage] = useState("sw");
  const [hub, setHub] = useState("Kariakoo Hub");
  const [view, setView] = useState("landing");
  const [servicesReady, setServicesReady] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [category, setCategory] = useState("All");
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [cartOpen, setCartOpen] = useState(false);
  const [pinOrder, setPinOrder] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [toastList, setToastList] = useState([]);
  const [pooling, setPooling] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("M-Pesa");
  const [deliverySlot, setDeliverySlot] = useState("05:00 AM - 06:00 AM");
  const [checkoutPhone, setCheckoutPhone] = useState("754998112");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminTab, setAdminTab] = useState("overview");
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminMedia, setAdminMedia] = useState([]);
  const [adminSettings, setAdminSettings] = useState(settings);
  const [adminSaving, setAdminSaving] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [now, setNow] = useState(Date.now());
  const t = TRANSLATIONS[language];

  useEffect(() => {
    localStorage.setItem("sokosafi_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const session = await apiRequest("/api/auth/me");
        if (cancelled) return;
        setCsrfToken(session.csrfToken);
        setUser(session.user);
        if (session.user) {
          setView(session.user.role === "admin" ? "admin" : session.user.role === "driver" ? "dispatch" : "catalog");
        }
        const [catalogResult, settingsResult] = await Promise.allSettled([
          apiRequest("/api/products"),
          apiRequest("/api/settings"),
        ]);
        if (cancelled) return;
        if (catalogResult.status === "fulfilled") setProducts(catalogResult.value.products);
        else setServiceError(catalogResult.reason.message);
        if (settingsResult.status === "fulfilled") {
          const loadedSettings = settingsResult.value.settings;
          setSettings(loadedSettings);
          setAdminSettings(loadedSettings);
          setHub(loadedSettings.defaultHub);
        } else if (!serviceError) {
          setServiceError(settingsResult.reason.message);
        }
        try {
          setPoolingInfo(await apiRequest("/api/pooling"));
        } catch (error) {
          console.error("Unable to load buying pool data.", error);
          setServiceError(error.message);
        }
        setServicesReady(true);
      } catch (error) {
        if (!cancelled) {
          setServiceError(error.message);
          setServicesReady(true);
        }
      }
    }
    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refresh = () =>
      apiRequest("/api/pooling")
        .then(setPoolingInfo)
        .catch((error) => console.error("Unable to refresh buying pool data.", error));
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    apiRequest("/api/orders")
      .then((data) => {
        if (!cancelled) setOrders(data.orders);
      })
      .catch((error) => {
        if (!cancelled) notify(error.message, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (user?.role !== "admin" || view !== "admin") return;
    let cancelled = false;
    Promise.all([
      apiRequest("/api/admin/users"),
      apiRequest("/api/admin/orders"),
      apiRequest("/api/admin/products"),
      apiRequest("/api/admin/media"),
      apiRequest("/api/admin/settings"),
    ])
      .then(([usersData, ordersData, productsData, mediaData, settingsData]) => {
        if (cancelled) return;
        setUsers(usersData.users);
        setAdminOrders(ordersData.orders);
        setAdminProducts(productsData.products);
        setAdminMedia(mediaData.assets);
        setAdminSettings(settingsData.settings);
      })
      .catch((error) => {
        if (!cancelled) notify(error.message, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [user, view]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const current = new Date(now);
    const localDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Dar_es_Salaam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(current);
    const dateParts = Object.fromEntries(localDate.map((part) => [part.type, part.value]));
    let cutoff = Date.UTC(
      Number(dateParts.year),
      Number(dateParts.month) - 1,
      Number(dateParts.day),
      settings.poolingCutoffHour - 3,
    );
    if (cutoff <= now) cutoff += 86400000;
    const secondsLeft = Math.max(0, Math.floor((cutoff - now) / 1000));
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;
    setCountdown(
      `${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(seconds).padStart(2, "0")}s`,
    );
  }, [now, settings.poolingCutoffHour]);

  const notify = (message, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToastList((items) => [...items, { id, message, type }]);
    window.setTimeout(
      () => setToastList((items) => items.filter((item) => item.id !== id)),
      4000,
    );
  };

  const navigate = (nextView) => {
    if (!user && nextView !== "landing") {
      notify("Tafadhali ingia au sajili akaunti kwanza.");
      setAuthTab("login");
      setAuthOpen(true);
      return;
    }
    if (nextView === "admin" && user?.role !== "admin") {
      notify("Eneo hili linahitaji Mamlaka ya Admin!", "error");
      return;
    }
    if (nextView === "dispatch" && !["driver", "admin"].includes(user?.role)) {
      notify("Eneo hili limetengwa kwa Madereva na Admin pekee.");
      return;
    }
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAuth = (tab = "login") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const login = async (phone, password) => {
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: { phone, password },
      });
      const session = await apiRequest("/api/auth/me");
      setCsrfToken(session.csrfToken);
      setUser(session.user);
      setAuthOpen(false);
      notify(`Karibu tena, ${session.user.fullName}!`, "success");
      setView(session.user.role === "admin" ? "admin" : session.user.role === "driver" ? "dispatch" : "catalog");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const register = async ({ fullName, phone, role, password }) => {
    try {
      const result = await apiRequest("/api/auth/register", {
        method: "POST",
        body: { fullName, phone, role, password },
      });
      setAuthOpen(false);
      if (result?.pendingApproval) {
        notify("Usajili umefanikiwa! Akaunti yako inasubiri uhakiki wa Admin.", "info");
        return;
      }
      const session = await apiRequest("/api/auth/me");
      setCsrfToken(session.csrfToken);
      setUser(session.user);
      setView("catalog");
      notify("Usajili umefanikiwa! Karibu SokoSafi.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const logout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST", body: {} });
      setCsrfToken(null);
      setUser(null);
      setView("landing");
      notify("Umetoka kwenye akaunti.");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const addToCart = (product) => {
    if (!user) {
      openAuth();
      return;
    }
    if (user.role !== "vendor") {
      notify("Ununuzi unapatikana kwa akaunti za wafanyabiashara pekee.", "error");
      return;
    }
    setCart((items) => {
      const found = items.find((item) => item.id === product.id);
      return found
        ? items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
        : [...items, { ...product, qty: 1 }];
    });
    notify(`${product.swahiliName} imeongezwa kwenye kikapu!`, "success");
  };

  const updateQuantity = (productId, delta) => {
    setCart((items) =>
      items
        .map((item) => item.id === productId ? { ...item, qty: item.qty + delta } : item)
        .filter((item) => item.qty > 0),
    );
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.priceTZS * item.qty, 0);
  const cartWeight = cart.reduce((sum, item) => sum + item.weightKg * item.qty, 0);
  const deliveryFee = cart.length ? settings.deliveryFeeTZS : 0;
  const discount = pooling ? Math.round(cartSubtotal * settings.poolingDiscountPercent / 100) : 0;
  const grandTotal = Math.max(0, cartSubtotal + deliveryFee - discount);
  const poolWeight = poolingInfo.currentKg;

  const processCheckout = async () => {
    if (!user) {
      openAuth();
      return;
    }
    if (!cart.length) {
      notify("Kikapu chako kiko tupu!", "error");
      return;
    }
    if (!checkoutPhone.trim() || checkoutPhone.trim().length < 8) {
      notify("Weka namba sahihi ya simu ya M-Pesa/Airtel!", "error");
      return;
    }
    setCheckoutLoading(true);
    try {
      const result = await apiRequest("/api/orders", {
        method: "POST",
        body: {
          items: cart.map((item) => ({ id: item.id, qty: item.qty })),
          hub,
          deliverySlot,
          paymentMethod,
          paymentPhone: checkoutPhone,
          pooling,
        },
      });
      const refreshed = await apiRequest("/api/orders");
      setOrders(refreshed.orders);
      setCart([]);
      setCartOpen(false);
      notify(
        `Oda ${result.order.id} imewekwa na inasubiri malipo. Hali: ${result.order.paymentStatus}. PIN ya delivery: ${result.order.deliveryPin}`,
        "info",
      );
      setView("account");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const refreshAdmin = async () => {
    const [usersData, ordersData, productsData, mediaData, settingsData] = await Promise.all([
      apiRequest("/api/admin/users"),
      apiRequest("/api/admin/orders"),
      apiRequest("/api/admin/products"),
      apiRequest("/api/admin/media"),
      apiRequest("/api/admin/settings"),
    ]);
    setUsers(usersData.users);
    setAdminOrders(ordersData.orders);
    setAdminProducts(productsData.products);
    setAdminMedia(mediaData.assets);
    setAdminSettings(settingsData.settings);
  };

  const setUserStatus = async (userId, status) => {
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: { status },
      });
      await refreshAdmin();
      notify("Hali ya akaunti imesasishwa.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const setUserRole = async (userId, role) => {
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: { role },
      });
      await refreshAdmin();
      notify("Jukumu la akaunti limesasishwa.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Una uhakika unataka kufuta akaunti hii?")) return;
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
      await refreshAdmin();
      notify("Akaunti imefutwa kwenye mfumo.");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const verifyPin = async () => {
    try {
      await apiRequest(`/api/orders/${encodeURIComponent(pinOrder)}/delivery`, {
        method: "POST",
        body: { pin: pinInput },
      });
      const refreshed = await apiRequest("/api/orders");
      setOrders(refreshed.orders);
      setPinOrder(null);
      setPinInput("");
      setPinError(false);
      notify(`Mzigo #${pinOrder} umethibitishwa na kukabidhiwa!`, "success");
    } catch (error) {
      setPinError(true);
      notify(error.message, "error");
    }
  };

  const saveSettings = async () => {
    setAdminSaving(true);
    try {
      const result = await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: adminSettings,
      });
      setSettings(result.settings);
      setHub(result.settings.defaultHub);
      notify("Mipangilio imehifadhiwa.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setAdminSaving(false);
    }
  };

  const saveProduct = async (product) => {
    try {
      const isExisting = Boolean(product.id);
      await apiRequest(
        isExisting ? `/api/admin/products/${encodeURIComponent(product.id)}` : "/api/admin/products",
        { method: isExisting ? "PUT" : "POST", body: product },
      );
      await refreshAdmin();
      setAdminTab("products");
      notify(isExisting ? "Bidhaa imesasishwa." : "Bidhaa imeongezwa.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const archiveProduct = async (productId) => {
    if (!window.confirm("Una uhakika unataka kuondoa bidhaa hii kwenye katalogi?")) return;
    try {
      await apiRequest(`/api/admin/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
      await refreshAdmin();
      notify("Bidhaa imefichwa kwenye katalogi.");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const updateAdminOrder = async (orderId, action) => {
    const confirmation =
      action === "confirm_manual_payment"
        ? "Thibitisha tu baada ya kukagua malipo nje ya mfumo. Utaidhinisha oda isafirishwe?"
        : "Una uhakika unataka kufuta oda hii isiyolipwa?";
    if (!window.confirm(confirmation)) return;
    try {
      await apiRequest(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        body: { action },
      });
      await refreshAdmin();
      notify("Oda imesasishwa.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const currentOrders = useMemo(
    () => orders,
    [orders, user],
  );
  const filteredUsers = useMemo(() => {
    const query = adminSearch.toLowerCase();
    return users.filter((item) =>
      item.fullName.toLowerCase().includes(query) || item.phone.includes(query),
    );
  }, [users, adminSearch]);
  const activeOrders = orders.filter((order) => order.status === "DISPATCHED");
  const totalVolume = orders.reduce(
    (sum, order) => sum + (order.paymentStatus === "PAID" ? order.totalTZS : 0),
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen flex flex-col text-slate-800 font-sans antialiased selection:bg-soko-600 selection:text-white pb-20 md:pb-0">
      <Header
        user={user}
        hub={hub}
        setHub={(value) => {
          setHub(value);
          notify(`Kituo kimebadilishwa kuwa: ${value}`);
        }}
        language={language}
        view={view}
        toggleLanguage={() => setLanguage((value) => value === "sw" ? "en" : "sw")}
        t={t}
        navigate={navigate}
        openAuth={openAuth}
        openCart={() => setCartOpen(true)}
        cartCount={cartCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!servicesReady && <div role="status" className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">Inaunganisha huduma za SokoSafi...</div>}
        {serviceError && servicesReady && <div role="alert" className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm"><strong>Huduma za backend hazipatikani:</strong> {serviceError} Kagua mipangilio ya Cloudflare Pages na bindings zake.</div>}
        {servicesReady && view === "landing" && <Landing openAuth={openAuth} />}
        {servicesReady && view === "catalog" && (
          <Catalog
            t={t}
            language={language}
            hub={hub}
            poolingDiscountPercent={settings.poolingDiscountPercent}
            products={products}
            category={category}
            setCategory={setCategory}
            addToCart={addToCart}
            navigate={navigate}
          />
        )}
        {servicesReady && view === "pooling" && (
          <Pooling
            t={t}
            countdown={countdown}
            poolWeight={poolWeight}
            targetKg={settings.poolingTargetKg}
            discountPercent={settings.poolingDiscountPercent}
            poolPercent={Math.min(100, Math.round((poolWeight / settings.poolingTargetKg) * 100))}
            activity={poolingInfo.activity}
            navigate={navigate}
          />
        )}
        {servicesReady && view === "dispatch" && (
          <Dispatch
            t={t}
            user={user}
            hub={hub}
            orders={activeOrders}
            openPin={(orderId) => {
              setPinOrder(orderId);
              setPinInput("");
              setPinError(false);
            }}
          />
        )}
        {servicesReady && view === "account" && (
          <Account
            t={t}
            user={user}
            orders={currentOrders}
            onLogout={logout}
          />
        )}
        {servicesReady && view === "admin" && (
          <Admin
            t={t}
            users={filteredUsers}
            totalUsers={users.length}
            vendorCount={users.filter((item) => item.role === "vendor").length}
            pendingDrivers={users.filter((item) => item.role === "driver" && item.status === "pending_approval").length}
            totalVolume={totalVolume}
            search={adminSearch}
            setSearch={setAdminSearch}
            activeTab={adminTab}
            setActiveTab={setAdminTab}
            orders={adminOrders}
            products={adminProducts}
            media={adminMedia}
            settings={adminSettings}
            setSettings={setAdminSettings}
            saveSettings={saveSettings}
            savingSettings={adminSaving}
            saveProduct={saveProduct}
            archiveProduct={archiveProduct}
            refreshAdmin={refreshAdmin}
            deleteMedia={async (key) => {
              try {
                await apiRequest(`/api/admin/media/${encodeURIComponent(key)}`, { method: "DELETE" });
                await refreshAdmin();
                notify("Picha imefutwa kwenye R2.", "success");
              } catch (error) {
                notify(error.message, "error");
              }
            }}
            updateOrder={updateAdminOrder}
            setUserRole={setUserRole}
            setUserStatus={setUserStatus}
            deleteUser={deleteUser}
          />
        )}
      </main>

      <MobileNav user={user} view={view} t={t} navigate={navigate} />

      {authOpen && (
        <AuthModal
          tab={authTab}
          setTab={setAuthTab}
          close={() => setAuthOpen(false)}
          login={login}
          register={register}
        />
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart}
          language={language}
          hub={hub}
          pooling={pooling}
          setPooling={setPooling}
          updateQuantity={updateQuantity}
          subtotal={cartSubtotal}
          weight={cartWeight}
          deliveryFee={deliveryFee}
          discount={discount}
          total={grandTotal}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          deliverySlot={deliverySlot}
          setDeliverySlot={setDeliverySlot}
          checkoutPhone={checkoutPhone}
          setCheckoutPhone={setCheckoutPhone}
          checkoutLoading={checkoutLoading}
          checkout={processCheckout}
          close={() => setCartOpen(false)}
          t={t}
        />
      )}

      {pinOrder && (
        <PinModal
          value={pinInput}
          setValue={setPinInput}
          error={pinError}
          close={() => setPinOrder(null)}
          verify={verifyPin}
          t={t}
        />
      )}

      <div className="fixed bottom-20 md:bottom-6 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toastList.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
              toast.type === "success" ? "bg-soko-800" : toast.type === "error" ? "bg-red-800" : "bg-slate-800"
            }`}
          >
            <Icon name={toast.type === "success" ? "fa-circle-check text-emerald-400" : "fa-circle-info text-amberCustom-500"} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  ["catalog", "fa-border-all", "catalog"],
  ["pooling", "fa-people-group", "pooling"],
  ["dispatch", "fa-motorcycle", "dispatch"],
  ["admin", "fa-user-shield", "admin"],
  ["account", "fa-wallet", "account"],
];

function Header({ user, hub, setHub, language, view, toggleLanguage, t, navigate, openAuth, openCart, cartCount }) {
  const canSeeDispatch = user && ["driver", "admin"].includes(user.role);
  const canSeeAdmin = user?.role === "admin";
  const showCart = user?.role === "vendor";
  const name = user ? user.fullName.split(" ")[0] : t.login + " / " + t.register;

  return (
    <header className="bg-soko-800 text-white sticky top-0 z-30 shadow-md">
      <div className="bg-soko-700/60 px-4 py-1.5 text-xs border-b border-soko-600/50 flex justify-between items-center max-w-7xl mx-auto">
        <label className="flex items-center gap-2">
          <Icon name="fa-location-dot text-amberCustom-500" />
          <span>{t.hub}</span>
          <select value={hub} onChange={(event) => setHub(event.target.value)} className="bg-soko-800 text-amberCustom-500 font-semibold rounded px-2 py-0.5 border border-soko-600">
            {HUBS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={() => user ? navigate("account") : openAuth()} className="flex items-center gap-2 bg-soko-800 hover:bg-soko-600 px-2.5 py-1 rounded border border-soko-600">
            <Icon name="fa-circle-user text-amberCustom-500" />
            <span className="font-semibold">{name}</span>
            {user && <span className="text-[10px] bg-amberCustom-600 px-1.5 py-0.5 rounded">{user.role.toUpperCase()}</span>}
          </button>
          <button onClick={toggleLanguage} className="bg-soko-800 hover:bg-soko-600 px-2.5 py-1 rounded border border-soko-600 font-bold">
            {language.toUpperCase()}
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
        <button onClick={() => navigate("landing")} className="flex items-center gap-3 text-left">
          <span className="bg-amberCustom-600 p-2.5 rounded-xl shadow-lg flex items-center justify-center h-10 w-10">
            <Icon name="fa-store" />
          </span>
          <span>
            <span className="font-black text-xl tracking-tight leading-none block">SokoSafi <span className="text-xs bg-amberCustom-600 font-medium px-1.5 py-0.5 rounded-full">TZ</span></span>
            <span className="text-[11px] text-soko-100/90 font-medium hidden sm:block mt-0.5">{t.tagline}</span>
          </span>
        </button>
        {user && (
          <nav className="hidden md:flex gap-1 bg-soko-700/50 p-1 rounded-xl border border-soko-600">
            {NAV_ITEMS.filter(([id]) => id !== "dispatch" || canSeeDispatch).filter(([id]) => id !== "admin" || canSeeAdmin).map(([id, icon, label]) => (
              <button key={id} onClick={() => navigate(id)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${view === id ? "bg-soko-600 text-white" : id === "admin" ? "text-amberCustom-500" : "text-soko-100 hover:text-white"} hover:bg-soko-600/50`}>
                <Icon name={icon} /><span>{t[label]}</span>
              </button>
            ))}
          </nav>
        )}
        {showCart && (
          <button onClick={openCart} className="relative bg-amberCustom-600 hover:bg-amberCustom-700 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md">
            <Icon name="fa-cart-shopping" /><span className="hidden sm:inline">{t.cart}</span>
            <span className="bg-white text-soko-800 text-xs font-black px-2 py-0.5 rounded-full">{cartCount}</span>
          </button>
        )}
      </div>
    </header>
  );
}

function Landing({ openAuth }) {
  return (
    <section className="space-y-12 py-4">
      <div className="bg-gradient-to-br from-soko-900 via-soko-800 to-soko-700 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-soko-600/40 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl space-y-4">
          <span className="bg-amberCustom-500 text-slate-900 font-black text-xs uppercase px-3 py-1 rounded-full inline-block tracking-wider">SokoSafi Tanzania</span>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight">Nunua Bidhaa za Masoko kwa Pamoja, Okoa Gharama za Usafiri.</h1>
          <p className="text-sm sm:text-base text-soko-100 leading-relaxed">Mfumo wa kidijitali unaowaunganisha wafanyabiashara wa masoko kununua bidhaa za jumla kwa bei shindani na kuzipokea kupitia Bodaboda na Bajaji.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={() => openAuth("login")} className="bg-amberCustom-600 hover:bg-amberCustom-700 font-bold px-6 py-3.5 rounded-xl flex items-center gap-2"><Icon name="fa-right-to-bracket" />Ingia Kwenye Akaunti</button>
            <button onClick={() => openAuth("register")} className="bg-white/10 hover:bg-white/20 border border-white/20 font-bold px-6 py-3.5 rounded-xl flex items-center gap-2"><Icon name="fa-user-plus" />Sajili Akaunti Mpya</button>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 max-w-sm w-full space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Icon name="fa-shield-halved text-amberCustom-500" />Akaunti salama kwa biashara yako</h2>
          <p className="text-sm text-soko-100 leading-relaxed">Sajili akaunti yako binafsi. Uthibitishaji wa madereva na wauzaji wa jumla hufanywa na msimamizi kabla ya kuanza kutumia mfumo.</p>
          <button onClick={() => openAuth("register")} className="bg-amberCustom-600 hover:bg-amberCustom-700 font-bold px-5 py-3 rounded-xl flex items-center gap-2"><Icon name="fa-user-plus" />Fungua akaunti</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          ["fa-store", "bg-soko-100 text-soko-700", "Kwa Wafanyabiashara (Vendors)", "Unganisha oda yako na wafanyabiashara wengine wa mtaa wako. Pata bei za jumla moja kwa moja kutoka kituo cha Kariakoo."],
          ["fa-motorcycle", "bg-amber-100 text-amber-800", "Kwa Madereva (Drivers)", "Pokea mizigo iliyokusanywa pamoja na uthibitishe makabidhiano kwa PIN salama kutoka kwa mfanyabiashara."],
          ["fa-receipt", "bg-slate-900 text-white", "Oda zilizo wazi", "Fuatilia oda, malipo, na usafirishaji wako kupitia akaunti moja salama."],
        ].map(([icon, color, title, description]) => (
          <article key={title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-xl`}><Icon name={icon} /></div>
            <h2 className="font-bold text-slate-900 text-lg">{title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Catalog({ t, language, hub, poolingDiscountPercent, products, category, setCategory, addToCart, navigate }) {
  const visibleProducts = products.filter((item) => item.isActive !== false && item.hubAvailability.includes(hub) && (category === "All" || item.category === category));
  return (
    <section className="space-y-6">
      <div className="mb-6 bg-gradient-to-r from-soko-600 to-soko-800 text-white p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Icon name="fa-piggy-bank text-amberCustom-500 text-2xl hidden sm:block" />
          <div><h2 className="font-bold">{t.activePool} <span className="bg-amberCustom-500 text-slate-900 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">Punguzo {poolingDiscountPercent}%</span></h2><p className="text-xs text-soko-100 mt-0.5">{t.poolDescription}</p></div>
        </div>
        <button onClick={() => navigate("pooling")} className="whitespace-nowrap bg-amberCustom-600 hover:bg-amberCustom-700 text-xs font-bold px-4 py-2.5 rounded-xl">{t.viewPool} <Icon name="fa-arrow-right ml-1" /></button>
      </div>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        <div className="flex gap-2">
          {CATEGORIES.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${category === item ? "bg-soko-600 text-white border-soko-600" : "bg-white text-slate-700 border-slate-200"}`}>
              {item === "All" ? (language === "sw" ? "Zote" : "All") : item}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 hidden lg:block whitespace-nowrap"><Icon name="fa-shield-halved text-soko-600 mr-1" />{t.quality}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {visibleProducts.map((product) => {
          const title = language === "sw" ? product.swahiliName : product.englishName;
          return (
            <article key={product.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img src={product.image} alt={title} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                  <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md">{product.unit}</span>
                </div>
                <div className="p-4">
                  <span className="text-[10px] text-soko-600 font-extrabold uppercase tracking-wider">{product.category}</span>
                  <h2 className="font-bold text-slate-900 text-base mt-0.5 leading-snug">{title}</h2>
                  <div className="mt-3 flex justify-between items-baseline">
                    <div><span className="text-xs text-slate-400">Bei ya Jumla:</span><p className="text-lg font-black text-soko-700">{formatMoney(product.priceTZS)}</p></div>
                    <span className="text-xs font-semibold text-slate-500">{product.weightKg} kg</span>
                  </div>
                </div>
              </div>
              <div className="p-4 pt-0">
                <button onClick={() => addToCart(product)} className="w-full bg-soko-600 hover:bg-soko-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"><Icon name="fa-plus" />{language === "sw" ? "Ongeza Kikapuni" : "Add to Cart"}</button>
              </div>
            </article>
          );
        })}
        {!visibleProducts.length && <p className="col-span-full text-center text-sm text-slate-500 py-12">Hakuna bidhaa zinazopatikana kwenye kundi hili na kituo hiki.</p>}
      </div>
    </section>
  );
}

function Pooling({ t, countdown, poolWeight, targetKg, discountPercent, poolPercent, activity, navigate }) {
  const remaining = Math.max(0, targetKg - poolWeight);
  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
          <div><span className="text-xs font-bold uppercase tracking-wider text-soko-600 bg-soko-50 px-2.5 py-1 rounded-md">{t.poolTag}</span><h1 className="text-2xl font-black text-slate-900 mt-2">Dar es Salaam - Kigamboni Ward Pool</h1><p className="text-sm text-slate-500 mt-0.5">{t.poolDesc}</p></div>
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col items-end min-w-[200px] w-full md:w-auto"><span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">{t.remaining}</span><span className="font-mono text-2xl font-black text-amberCustom-500">{countdown}</span><span className="text-[10px] text-slate-400 mt-0.5">Kufunga oda za leo saa 3:00 Usiku</span></div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-end"><div><span className="text-xs text-slate-500">Uzito wa Sasa:</span><span className="text-2xl font-black text-soko-700 ml-1">{poolWeight} kg</span></div><div className="text-right"><span className="text-xs text-slate-500">{t.target} {discountPercent}%</span><span className="text-lg font-bold text-slate-800 ml-1">{targetKg} kg</span></div></div>
          <div className="w-full bg-slate-100 rounded-full h-5 p-1 border border-slate-200 overflow-hidden"><div className="bg-gradient-to-r from-soko-500 to-soko-600 h-full rounded-full transition-all duration-700" style={{ width: `${poolPercent}%` }} /></div>
          <p className="text-xs text-slate-500 text-right">{remaining > 0 ? `Bado Kilo ${remaining} tu kufikia lengo!` : `Lengo limefikiwa! Punguzo ${discountPercent}% limewezeshwa.`}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-soko-50 rounded-2xl p-6 border border-soko-200 flex flex-col justify-between">
          <div><div className="w-12 h-12 bg-soko-600 text-white rounded-xl flex items-center justify-center text-xl mb-4"><Icon name="fa-plus" /></div><h2 className="text-lg font-bold text-slate-900">{t.joinPool}</h2><p className="text-xs text-slate-600 mt-2 leading-relaxed">Ongeza bidhaa kwenye kikapu chako na uchague Mfumo wa Ukusanyaji wakati wa kulipia. Oda yako itahesabiwa kwenye lengo la Kigamboni.</p></div>
          <button onClick={() => navigate("catalog")} className="mt-6 w-full bg-soko-600 hover:bg-soko-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><Icon name="fa-basket-shopping" />{t.browse}</button>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-soko-500 animate-ping" />{t.liveFeed}</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activity.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">Hakuna oda zilizolipwa kwenye ukusanyaji wa leo bado.</p> : activity.map((item) => <div key={`${item.createdAt}-${item.hub}`} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs"><div><span className="font-bold text-slate-800 block">{item.hub}</span><span className="text-[11px] text-slate-500">{item.item}</span></div><span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleTimeString()}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Dispatch({ t, user, hub, orders, openPin }) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div><span className="text-xs font-bold uppercase tracking-wider text-amberCustom-600 bg-amber-50 px-2.5 py-1 rounded-md">{t.driverArea}</span><h1 className="text-2xl font-black text-slate-900 mt-1">{t.dispatchTitle}</h1></div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200"><Icon name="fa-motorcycle text-soko-600" /><span className="text-xs font-bold text-slate-700">Dereva: {user?.fullName}</span></div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label={t.pickup} value="Kariakoo Aggregation Hub #4" />
        <InfoCard label={t.dropoff} value={hub} />
        <InfoCard label={t.deliveryWindow} value="Asubuhi (05:00 AM - 06:00 AM)" />
      </div>
      <div className="mt-8">
        <h2 className="font-bold text-slate-900 text-base mb-4 flex justify-between items-center"><span>{t.manifest}</span><span className="bg-soko-100 text-soko-800 text-xs font-bold px-2.5 py-1 rounded-full">{orders.length} Orders</span></h2>
        <div className="space-y-4">
          {orders.length === 0 ? <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200"><Icon name="fa-circle-check text-soko-500 text-3xl mb-2" /><p className="text-xs font-bold text-slate-600">Hakuna mizigo inayokusubiri kusafirisha kwa sasa.</p></div> :
            orders.map((order) => <div key={order.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div className="space-y-1"><div className="flex items-center gap-2"><span className="font-mono text-xs font-black text-slate-900">#{order.id}</span><span className="bg-soko-100 text-soko-800 text-[10px] font-bold px-2 py-0.5 rounded">{order.hub}</span></div><p className="text-xs text-slate-600 font-medium">{order.items?.map((item) => `${item.swahiliName || item.name} (${(item.weightKg || 0) * item.qty}kg)`).join(", ") || "Mzigo"}</p><p className="text-[11px] text-slate-400">Njia ya Malipo: {order.paymentMethod} | Muda: {order.slot || "Asubuhi"}</p></div><button onClick={() => openPin(order.id)} className="w-full sm:w-auto bg-amberCustom-600 hover:bg-amberCustom-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"><Icon name="fa-check" />Kamilisha Delivery</button></div>)
          }
        </div>
      </div>
    </section>
  );
}

function InfoCard({ label, value }) {
  return <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><span className="text-xs text-slate-500">{label}</span><p className="font-bold text-slate-900 mt-0.5">{value}</p></div>;
}

function Account({ t, user, orders, onLogout }) {
  const initials = user?.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
          <div className="w-20 h-20 bg-soko-100 text-soko-700 rounded-full mx-auto flex items-center justify-center text-3xl font-black border-2 border-soko-500">{initials}</div>
          <h1 className="text-xl font-bold text-slate-900 mt-3">{user?.fullName}</h1><p className="text-xs text-slate-500">{user?.phone}</p>
          <div className="mt-2 flex justify-center gap-2"><span className="bg-soko-50 text-soko-700 border border-soko-200 text-xs font-bold px-3 py-1 rounded-full uppercase">{user?.role}</span><span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">{user?.status}</span></div>
          <button onClick={onLogout} className="mt-4 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl w-full"><Icon name="fa-right-from-bracket mr-1" />{t.logout}</button>
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-soko-950 text-white rounded-2xl p-6 shadow-lg">
          <span className="text-[11px] uppercase tracking-wider text-amberCustom-500 font-bold">Mkopo wa Soko</span>
          <h2 className="text-lg font-black mt-2">Huduma ya mkopo haijaunganishwa</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">Hakuna kikomo cha mkopo au alama ya uaminifu inayokokotolewa kwenye akaunti hii kwa sasa.</p>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-slate-900 text-lg">{t.orderHistory}</h2></div>
          <div className="space-y-3">
            {orders.length === 0 ? <p className="text-xs text-slate-400 py-4 text-center">Huna oda zozote zilizowekwa bado.</p> : orders.map((order) => <div key={order.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2"><div className="flex justify-between items-start"><div><span className="font-mono text-xs font-bold text-slate-800">#{order.id}</span><span className="text-[10px] text-slate-400 block">{new Date(order.date).toLocaleDateString()}</span></div><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${order.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800" : order.status === "CANCELLED" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>{order.status} · {order.paymentStatus}</span></div><p className="text-xs text-slate-600">{order.items?.map((item) => `${item.swahiliName || item.name} (x${item.qty})`).join(", ") || "Bidhaa za Masoko"}</p><div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs"><span className="font-bold text-soko-700">{formatMoney(order.totalTZS)}</span><span className="font-mono text-slate-600">{order.paymentMethod}</span></div></div>)}
          </div>
        </div>
        <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 shadow-sm border border-slate-800">
          <div className="flex justify-between items-center mb-3"><h3 className="font-mono text-xs text-slate-400 uppercase font-bold tracking-wider"><Icon name="fa-database text-amberCustom-500 mr-2" />Hali ya Data ya Mfumo</h3><span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded">Cloudflare + PlanetScale</span></div>
          <p className="text-xs text-slate-300">Akaunti: {user?.role} · Hali: {user?.status} · Oda zako zinahifadhiwa kwenye PlanetScale.</p>
        </div>
      </div>
    </section>
  );
}

function Admin({
  t, users, totalUsers, vendorCount, pendingDrivers, totalVolume, search, setSearch,
  activeTab, setActiveTab, orders, products, media, settings, setSettings, saveSettings,
  savingSettings, saveProduct, archiveProduct, deleteMedia, updateOrder, setUserRole,
  setUserStatus, deleteUser, refreshAdmin,
}) {
  return (
    <section className="space-y-6">
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800"><div><span className="text-xs font-bold uppercase tracking-wider text-amberCustom-500 bg-amberCustom-500/10 px-2.5 py-1 rounded-md">{t.adminPortal}</span><h1 className="text-2xl font-black mt-2">SokoSafi Admin Portal (RBAC)</h1><p className="text-xs text-slate-400 mt-1">{t.adminDesc}</p></div><span className="text-xs font-bold text-slate-200"><Icon name="fa-user-shield text-amberCustom-500 mr-2" />Admin: Mkurugenzi Soko</span></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Metric label="Jumla ya Watumiaji" value={totalUsers} />
          <Metric label="Wafanyabiashara (Vendors)" value={vendorCount} color="text-emerald-400" />
          <Metric label="Madereva Wanaosubiri" value={pendingDrivers} color="text-amberCustom-500" />
          <Metric label="Jumla ya Miamala" value={formatMoney(totalVolume)} color="text-soko-500" />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {[
          ["overview", "Muhtasari"],
          ["products", "Bidhaa na Picha"],
          ["media", "Maktaba ya R2"],
          ["orders", "Oda na Malipo"],
          ["users", "Watumiaji"],
          ["settings", "Mipangilio"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold border ${activeTab === id ? "bg-soko-700 text-white border-soko-700" : "bg-white text-slate-700 border-slate-200"}`}>{label}</button>
        ))}
      </div>
      {activeTab === "overview" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
          <h2 className="font-bold text-slate-900 text-lg">Usimamizi wa Soko</h2>
          <p className="text-sm text-slate-600">Dhibiti bidhaa, picha za R2, oda, watumiaji, na mipangilio ya biashara kupitia sehemu zilizo juu.</p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Malipo:</strong> Hakuna gateway ya malipo iliyounganishwa. Oda zinabaki bila kulipwa hadi msimamizi athibitishe malipo nje ya mfumo. Unganisha gateway na webhook kabla ya kuwezesha malipo ya moja kwa moja.</div>
        </div>
      )}
      {activeTab === "products" && <ProductManager products={products} saveProduct={saveProduct} archiveProduct={archiveProduct} />}
      {activeTab === "media" && <MediaManager assets={media} deleteMedia={deleteMedia} refresh={refreshAdmin} />}
      {activeTab === "orders" && <AdminOrders orders={orders} updateOrder={updateOrder} />}
      {activeTab === "settings" && <SettingsPanel settings={settings} setSettings={setSettings} saveSettings={saveSettings} saving={savingSettings} />}
      {activeTab === "users" && <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"><h2 className="font-bold text-slate-900 text-lg">{t.userManagement}</h2><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tafuta kwa jina/simu..." className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-soko-600" /></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs text-slate-700"><thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200"><tr><th className="p-3">Jina & Simu</th><th className="p-3">Jukumu (Role)</th><th className="p-3">Hali (Status)</th><th className="p-3">Tarehe ya Usajili</th><th className="p-3 text-right">Vitendo</th></tr></thead><tbody className="divide-y divide-slate-100">
          {users.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="p-3"><span className="font-bold text-slate-900 block">{item.fullName}</span><span className="text-[11px] text-slate-400">{item.phone}</span></td><td className="p-3"><select value={item.role} onChange={(event) => setUserRole(item.id, event.target.value)} className="bg-slate-100 font-bold border border-slate-300 rounded px-2 py-1 text-[11px]">{["vendor", "driver", "aggregator", "admin"].map((role) => <option key={role} value={role}>{role}</option>)}</select></td><td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === "active" ? "bg-emerald-100 text-emerald-800" : item.status === "pending_approval" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{item.status.toUpperCase()}</span></td><td className="p-3 text-slate-400 text-[11px]">{new Date(item.regDate).toLocaleDateString()}</td><td className="p-3 text-right space-x-1">{item.status === "pending_approval" && <button onClick={() => setUserStatus(item.id, "active")} className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[10px]">Approve</button>}{item.status === "active" && <button onClick={() => setUserStatus(item.id, "suspended")} className="bg-amber-600 text-white font-bold px-2 py-1 rounded text-[10px]">Suspend</button>}{item.status === "suspended" && <button onClick={() => setUserStatus(item.id, "active")} className="bg-soko-600 text-white font-bold px-2 py-1 rounded text-[10px]">Activate</button>}<button onClick={() => deleteUser(item.id)} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-[10px]">Delete</button></td></tr>)}
        </tbody></table></div>
      </div>}
    </section>
  );
}

const EMPTY_PRODUCT = {
  swahiliName: "",
  englishName: "",
  category: "Grains",
  priceTZS: 0,
  weightKg: 0,
  unit: "",
  image: "",
  hubAvailability: ["Kariakoo Hub"],
  isActive: true,
};

function ProductManager({ products, saveProduct, archiveProduct }) {
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");

  const update = (key, value) => setEditing((current) => ({ ...current, [key]: value }));
  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await apiRequest("/api/admin/media", { method: "POST", body: form });
      update("image", result.url);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="font-bold text-lg">Bidhaa na picha za R2</h2><button onClick={() => { setEditing({ ...EMPTY_PRODUCT }); setFormError(""); }} className="bg-soko-700 text-white px-4 py-2 rounded-xl text-xs font-bold"><Icon name="fa-plus mr-1" />Ongeza bidhaa</button></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => <article key={product.id} className="border border-slate-200 rounded-xl overflow-hidden"><img src={product.image} alt="" className="h-36 w-full object-cover bg-slate-100" /><div className="p-4 space-y-2"><div className="flex justify-between items-start gap-2"><h3 className="font-bold text-sm">{product.swahiliName}</h3><span className={`text-[10px] font-bold ${product.isActive ? "text-emerald-700" : "text-slate-500"}`}>{product.isActive ? "INAONEKANA" : "IMEFICHWA"}</span></div><p className="text-xs text-slate-500">{product.category} · {formatMoney(product.priceTZS)} · {product.weightKg} kg</p><div className="flex gap-2"><button onClick={() => { setEditing({ ...product }); setFormError(""); }} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold">Hariri</button>{product.isActive && <button onClick={() => archiveProduct(product.id)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold">Ficha</button>}</div></div></article>)}
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <form onSubmit={(event) => { event.preventDefault(); setFormError(""); saveProduct(editing); setEditing(null); }} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-bold text-lg">{editing.id ? "Hariri bidhaa" : "Ongeza bidhaa"}</h3><button type="button" onClick={() => setEditing(null)} aria-label="Funga"><Icon name="fa-xmark" /></button></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold">Jina la Kiswahili<input required maxLength={160} value={editing.swahiliName} onChange={(event) => update("swahiliName", event.target.value)} className="mt-1 w-full border rounded-lg p-2" /></label>
              <label className="text-xs font-bold">Product name<input required maxLength={160} value={editing.englishName} onChange={(event) => update("englishName", event.target.value)} className="mt-1 w-full border rounded-lg p-2" /></label>
              <label className="text-xs font-bold">Category<select value={editing.category} onChange={(event) => update("category", event.target.value)} className="mt-1 w-full border rounded-lg p-2">{["Grains", "Vegetables", "Cooking Oil", "Poultry", "Other"].map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="text-xs font-bold">Unit<input required maxLength={80} value={editing.unit} onChange={(event) => update("unit", event.target.value)} className="mt-1 w-full border rounded-lg p-2" /></label>
              <label className="text-xs font-bold">Bei (TZS)<input required type="number" min="1" value={editing.priceTZS} onChange={(event) => update("priceTZS", Number(event.target.value))} className="mt-1 w-full border rounded-lg p-2" /></label>
              <label className="text-xs font-bold">Uzito (kg)<input required type="number" min="0.01" step="0.01" value={editing.weightKg} onChange={(event) => update("weightKg", Number(event.target.value))} className="mt-1 w-full border rounded-lg p-2" /></label>
            </div>
            <label className="text-xs font-bold block">Picha ya bidhaa: pakia kwenye R2 au tumia URL<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => uploadImage(event.target.files?.[0])} className="mt-1 block w-full text-xs" /></label>
            {uploading && <p className="text-xs text-slate-500">Inapakia picha...</p>}
            <label className="text-xs font-bold block">Image URL<input required type="url" value={editing.image} onChange={(event) => update("image", event.target.value)} className="mt-1 w-full border rounded-lg p-2" /></label>
            <fieldset><legend className="text-xs font-bold mb-2">Vituo vinavyopatikana</legend><div className="grid sm:grid-cols-2 gap-2">{HUBS.map(([id, name]) => <label key={id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.hubAvailability.includes(id)} onChange={(event) => update("hubAvailability", event.target.checked ? [...editing.hubAvailability, id] : editing.hubAvailability.filter((value) => value !== id))} />{name}</label>)}</div></fieldset>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={editing.isActive} onChange={(event) => update("isActive", event.target.checked)} />Bidhaa inaonekana kwa wateja</label>
            {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Ghairi</button><button disabled={uploading} className="px-4 py-2 bg-soko-700 text-white rounded-lg text-xs font-bold">Hifadhi</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function AdminOrders({ orders, updateOrder }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
      <h2 className="font-bold text-lg">Oda na malipo</h2>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl">Malipo hayaunganishwi na gateway. Thibitisha malipo katika mfumo wa mtoa huduma kabla ya kuidhinisha oda.</p>
      {orders.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Hakuna oda bado.</p> : orders.map((order) => <article key={order.id} className="border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row gap-4 justify-between"><div><p className="font-mono font-bold text-sm">#{order.id}</p><p className="text-xs text-slate-600 mt-1">{order.items.map((item) => `${item.swahiliName} x${item.qty}`).join(", ")}</p><p className="text-xs text-slate-500 mt-1">{order.paymentMethod} · {order.paymentPhone} · {order.hub} · {new Date(order.date).toLocaleString()}</p><p className="text-xs mt-1">Hali: <strong>{order.status}</strong> / Malipo: <strong>{order.paymentStatus}</strong> · {formatMoney(order.totalTZS)}</p></div><div className="flex items-center gap-2">{order.status === "PENDING_PAYMENT" && <><button onClick={() => updateOrder(order.id, "confirm_manual_payment")} className="bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold">Thibitisha malipo</button><button onClick={() => updateOrder(order.id, "cancel")} className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs font-bold">Futa oda</button></>}</div></article>)}
    </div>
  );
}

function MediaManager({ assets, deleteMedia, refresh }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      await apiRequest("/api/admin/media", { method: "POST", body: form });
      await refresh();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
      <div><h2 className="font-bold text-lg">Maktaba ya picha (R2)</h2><p className="text-xs text-slate-500 mt-1">Pakia JPEG, PNG au WebP hadi 5 MB. Picha zinazotumika kwenye bidhaa haziwezi kufutwa.</p></div>
      <label className="inline-flex items-center gap-2 bg-soko-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">{uploading ? "Inapakia..." : "Pakia picha"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} className="sr-only" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {assets.length === 0 ? <p className="text-sm text-slate-500 py-8 text-center">Hakuna picha zilizopakiwa.</p> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{assets.map((asset) => <article key={asset.key} className="border border-slate-200 rounded-xl overflow-hidden"><img src={asset.url} alt="" className="h-36 w-full object-cover bg-slate-100" /><div className="p-3 space-y-2"><p className="font-mono text-[10px] break-all">{asset.key}</p><p className="text-[10px] text-slate-500">{Math.ceil(asset.size / 1024)} KB · {new Date(asset.uploaded).toLocaleDateString()}</p><button onClick={() => deleteMedia(asset.key)} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold">Futa</button></div></article>)}</div>
      }
    </section>
  );
}

function SettingsPanel({ settings, setSettings, saveSettings, saving }) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); saveSettings(); }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <h2 className="font-bold text-lg">Mipangilio ya biashara (Workers KV)</h2>
      <p className="text-xs text-slate-500">Mabadiliko yanahifadhiwa kwenye KV na kutumika kwa bei za oda mpya.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-xs font-bold">Gharama ya usafirishaji (TZS)<input type="number" min="0" max="1000000" value={settings.deliveryFeeTZS} onChange={(event) => setSettings({ ...settings, deliveryFeeTZS: Number(event.target.value) })} className="mt-1 w-full border rounded-lg p-2" /></label>
        <label className="text-xs font-bold">Punguzo la pool (%)<input type="number" min="0" max="50" value={settings.poolingDiscountPercent} onChange={(event) => setSettings({ ...settings, poolingDiscountPercent: Number(event.target.value) })} className="mt-1 w-full border rounded-lg p-2" /></label>
        <label className="text-xs font-bold">Lengo la uzito (kg)<input type="number" min="1" max="1000000" value={settings.poolingTargetKg} onChange={(event) => setSettings({ ...settings, poolingTargetKg: Number(event.target.value) })} className="mt-1 w-full border rounded-lg p-2" /></label>
        <label className="text-xs font-bold">Saa ya kufunga oda (0–23)<input type="number" min="0" max="23" value={settings.poolingCutoffHour} onChange={(event) => setSettings({ ...settings, poolingCutoffHour: Number(event.target.value) })} className="mt-1 w-full border rounded-lg p-2" /></label>
        <label className="text-xs font-bold">Kituo chaguomsingi<select value={settings.defaultHub} onChange={(event) => setSettings({ ...settings, defaultHub: event.target.value })} className="mt-1 w-full border rounded-lg p-2">{HUBS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      </div>
      <button disabled={saving} className="bg-soko-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-bold">{saving ? "Inahifadhi..." : "Hifadhi mipangilio"}</button>
    </form>
  );
}

function Metric({ label, value, color = "text-white" }) {
  return <div className="bg-slate-950 p-4 rounded-xl border border-slate-800"><span className="text-xs text-slate-400">{label}</span><p className={`text-2xl font-black mt-1 ${color}`}>{value}</p></div>;
}

function MobileNav({ user, view, t, navigate }) {
  if (!user) return null;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-soko-800 border-t border-soko-700 z-30 flex justify-around items-center px-2 py-2">
      {NAV_ITEMS.filter(([id]) => id !== "dispatch" || ["driver", "admin"].includes(user.role)).filter(([id]) => id !== "admin" || user.role === "admin").map(([id, icon, label]) => (
        <button key={id} onClick={() => navigate(id)} className={`flex flex-col items-center py-1 px-3 rounded-lg ${view === id ? "text-white" : "text-soko-300"}`}><Icon name={`${icon} text-lg`} /><span className="text-[10px] font-bold mt-0.5">{t[label]}</span></button>
      ))}
    </nav>
  );
}

function AuthModal({ tab, setTab, close, login, register }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("vendor");
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex border-b border-slate-200">
          {["login", "register"].map((item) => <button key={item} onClick={() => setTab(item)} className={`w-1/2 py-2.5 text-xs font-bold border-b-2 ${tab === item ? "border-soko-600 text-soko-600" : "border-transparent text-slate-400"}`}>{item === "login" ? "Ingia (Login)" : "Jisajili (Register)"}</button>)}
        </div>
        {tab === "login" ? (
          <form onSubmit={(event) => { event.preventDefault(); login(phone, password); }} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700">Namba ya Simu:<input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07XX XXX XXX" className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" /></label>
            <label className="block text-xs font-bold text-slate-700">Neno la Siri (Password):<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" /></label>
            <button type="submit" className="w-full bg-soko-600 hover:bg-soko-700 text-white font-bold py-3 rounded-xl text-xs">Ingia Kwenye Akaunti</button>
          </form>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); register({ fullName, phone, role, password }); }} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">Jina Kamili:<input type="text" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Mf. Kassim Majaliwa" className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" /></label>
            <label className="block text-xs font-bold text-slate-700">Namba ya Simu:<input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07XX XXX XXX" className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" /></label>
            <label className="block text-xs font-bold text-slate-700">Jukumu Lako Sokoni:<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"><option value="vendor">Mfanyabiashara wa Soko (Vendor)</option><option value="driver">Dereva Bodaboda / Bajaji (Driver)</option><option value="aggregator">Muuzaji wa Jumla (Market Aggregator)</option></select><span className="text-[10px] text-slate-400 mt-1 block">Madereva na wauzaji wa jumla watasubiri uhakiki wa Admin.</span></label>
            <label className="block text-xs font-bold text-slate-700">Neno la Siri:<input type="password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Angalau herufi 12" className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" /></label>
            <button type="submit" className="w-full bg-amberCustom-600 hover:bg-amberCustom-700 text-white font-bold py-3 rounded-xl text-xs">Sajili Akaunti</button>
          </form>
        )}
        <button onClick={close} className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 pt-2">Ghairi (Cancel)</button>
      </div>
    </div>
  );
}

function CartDrawer({ cart, language, hub, pooling, setPooling, updateQuantity, subtotal, weight, deliveryFee, discount, total, paymentMethod, setPaymentMethod, deliverySlot, setDeliverySlot, checkoutPhone, setCheckoutPhone, checkoutLoading, checkout, close, t }) {
  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="Funga kikapu" onClick={close} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <aside className="absolute top-0 right-0 h-full w-full max-w-md bg-white z-10 shadow-2xl flex flex-col">
        <div className="bg-soko-800 text-white p-5 flex justify-between items-center"><div className="flex items-center gap-3"><span className="bg-amberCustom-600 p-2 rounded-lg"><Icon name="fa-cart-shopping" /></span><div><h2 className="font-bold text-lg leading-tight">Kikapu cha Bidhaa</h2><p className="text-xs text-soko-200">{hub}</p></div></div><button onClick={close} className="text-soko-200 hover:text-white text-2xl px-2" aria-label="Funga"><Icon name="fa-xmark" /></button></div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!cart.length ? <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400"><Icon name="fa-basket-shopping text-5xl mb-3 text-slate-300" /><p className="text-sm font-bold text-slate-600">Kikapu chako kiko tupu</p><p className="text-xs mt-1">Chagua bidhaa masokoni ili kuendelea.</p></div> :
            cart.map((item) => <div key={item.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center gap-3"><div className="flex-1"><h3 className="font-bold text-xs text-slate-800">{language === "sw" ? item.swahiliName : item.englishName}</h3><span className="text-[11px] text-soko-700 font-extrabold mt-1 block">{formatMoney(item.priceTZS)} / unit</span></div><div className="flex items-center gap-2"><button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 bg-white border border-slate-300 rounded-lg">-</button><span className="font-bold text-xs w-4 text-center">{item.qty}</span><button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 bg-white border border-slate-300 rounded-lg">+</button></div></div>)
          }
        </div>
        <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-4 shadow-inner">
          <div className="space-y-1.5 text-xs text-slate-600">
            <SummaryRow label={t.subtotal} value={formatMoney(subtotal)} /><SummaryRow label={t.weight} value={`${weight} kg`} /><SummaryRow label={t.deliveryFee} value={formatMoney(deliveryFee)} />
            {pooling && subtotal > 0 && <SummaryRow label={t.discount} value={`- ${formatMoney(discount)}`} color="text-soko-700" />}
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-base font-black text-slate-900"><span>{t.total}</span><span className="text-soko-700 text-xl">{formatMoney(total)}</span></div>
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-soko-200 cursor-pointer shadow-sm text-xs font-bold text-slate-800"><input type="checkbox" checked={pooling} onChange={(event) => setPooling(event.target.checked)} className="rounded text-soko-600" />{t.poolToggle}</label>
            <label className="block text-xs font-bold text-slate-700">{t.deliverySlot}<select value={deliverySlot} onChange={(event) => setDeliverySlot(event.target.value)} className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5"><option value="05:00 AM - 06:00 AM">Saa 11:00 Asubuhi - 12:00 Asubuhi (05:00 AM - 06:00 AM)</option><option value="06:00 AM - 07:00 AM">Saa 12:00 Asubuhi - 01:00 Asubuhi (06:00 AM - 07:00 AM)</option></select></label>
            <fieldset><legend className="block text-xs font-bold text-slate-700 mb-1">{t.payment}</legend><div className="grid grid-cols-2 gap-2">{["M-Pesa", "Airtel Money", "Tigo Pesa"].map((method) => <label key={method} className="border border-slate-300 bg-white p-2 rounded-xl flex items-center gap-2 cursor-pointer text-xs font-semibold"><input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />{method === "M-Pesa" ? "Vodacom M-Pesa" : method}</label>)}</div></fieldset>
            <label className="block text-xs font-bold text-slate-700">{t.paymentPhone}<span className="mt-1 flex items-center bg-white border border-slate-300 rounded-xl"><span className="pl-3 text-xs text-slate-500 font-bold">+255</span><input type="tel" value={checkoutPhone} onChange={(event) => setCheckoutPhone(event.target.value)} className="w-full px-3 py-2 text-xs font-bold outline-none rounded-xl" /></span></label>
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg">Gateway ya malipo haijaunganishwa. Oda itasubiri uthibitisho wa malipo na haitasafirishwa moja kwa moja.</p>
            <button onClick={checkout} disabled={checkoutLoading} className="w-full bg-amberCustom-600 hover:bg-amberCustom-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg flex justify-center items-center gap-2 text-sm"><Icon name={checkoutLoading ? "fa-spinner animate-spin" : "fa-lock"} />{checkoutLoading ? "Inaweka oda..." : t.checkout}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value, color = "text-slate-800" }) {
  return <div className={`flex justify-between ${color}`}><span>{label}</span><span className="font-bold">{value}</span></div>;
}

function PinModal({ value, setValue, error, close, verify, t }) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 bg-soko-100 text-soko-600 rounded-full mx-auto flex items-center justify-center text-2xl"><Icon name="fa-key" /></div>
        <div><h2 className="font-bold text-slate-900 text-lg">{languageText(t, "Thibitisha Kupokea Mzigo", "Confirm Package Delivery")}</h2><p className="text-xs text-slate-500 mt-1">{languageText(t, "Weka PIN ya tarakimu 4 aliyopewa mfanyabiashara.", "Enter the vendor's 4-digit verification PIN.")}</p></div>
        <input autoFocus inputMode="numeric" maxLength={4} value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))} placeholder="----" className="w-full text-center font-mono text-2xl tracking-widest py-3 border-2 border-slate-200 rounded-xl focus:border-soko-600 outline-none font-bold" />
        {error && <p className="text-xs text-red-500 font-semibold">PIN siyo sahihi. Jaribu tena!</p>}
        <div className="flex gap-2 pt-2"><button onClick={close} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs">{t.cancelBtn || "Ghairi"}</button><button onClick={verify} className="w-1/2 bg-soko-600 hover:bg-soko-700 text-white font-bold py-2.5 rounded-xl text-xs">{t.confirmBtn || "Thibitisha"}</button></div>
      </div>
    </div>
  );
}

function languageText(t, swahili, english) {
  return t.catalog === "Catalog" ? english : swahili;
}

export default App;
