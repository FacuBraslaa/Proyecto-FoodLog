const API_BASE = "";

const state = {
  currentUser: null,
  meals: [],
  today: new Date().toISOString().slice(0, 10),
  editingMealId: null,
};

const mealTypeLabels = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  merienda: "Snack / Merienda",
};

const els = {
  header: document.getElementById("appHeader"),
  authView: document.getElementById("authView"),
  dashboard: document.getElementById("dashboardView"),
  userGreeting: document.getElementById("userGreeting"),
  logoutBtn: document.getElementById("logoutBtn"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  loginPanel: document.getElementById("loginPanel"),
  registerPanel: document.getElementById("registerPanel"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  addMealCard: document.getElementById("addMealCard"),
  toggleAddMeal: document.getElementById("toggleAddMeal"),
  cancelAddMeal: document.getElementById("cancelAddMeal"),
  addMealForm: document.getElementById("addMealForm"),
  resetMealForm: document.getElementById("resetMealForm"),
  mealsList: document.getElementById("mealsList"),
  dailyTotal: document.getElementById("dailyTotal"),
  todayLabel: document.getElementById("todayLabel"),
  refreshData: document.getElementById("refreshData"),
  addFoodForm: document.getElementById("addFoodForm"),
  foodName: document.getElementById("foodName"),
  foodUnit: document.getElementById("foodUnit"),
  foodCalories: document.getElementById("foodCalories"),
  toast: document.getElementById("toast"),
  toRegister: document.getElementById("toRegister"),
  toLogin: document.getElementById("toLogin"),
  backToLogin: document.getElementById("backToLogin"),
};

let selectedFoodId = null;

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function showToast(message, type = "info") {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.remove("show");
  els.toast.dataset.type = type;
  void els.toast.offsetWidth; // force reflow
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function setTodayLabel() {
  if (!els.todayLabel) return;
  const [year, month, day] = state.today.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  els.todayLabel.textContent = dateFormatter.format(date);
}

function switchAuthTab(mode) {
  const isLogin = mode === "login";
  els.loginTab.classList.toggle("active", isLogin);
  els.registerTab.classList.toggle("active", !isLogin);
  els.loginPanel.classList.toggle("hidden", !isLogin);
  els.registerPanel.classList.toggle("hidden", isLogin);
}

function setCurrentUser(user) {
  state.currentUser = user;
  if (user) {
    localStorage.setItem("foodlog_user", JSON.stringify(user));
    els.userGreeting.textContent = `Hola, ${user.username}`;
    els.authView.classList.add("hidden");
    els.dashboard.classList.remove("hidden");
    els.header.classList.remove("hidden");
    loadDashboard();
  } else {
    localStorage.removeItem("foodlog_user");
    els.userGreeting.textContent = "";
    els.authView.classList.remove("hidden");
    els.dashboard.classList.add("hidden");
    els.header.classList.add("hidden");
  }
}

async function loginUser(username, password, options = {}) {
  const trimmed = username?.trim();
  if (!trimmed || !password) {
    showToast("Ingresa tu usuario y contraseña", "error");
    return false;
  }

  const loginBtn = els.loginForm.querySelector(".primary-button");
  const original = loginBtn.textContent;
  if (!options.silent) {
    loginBtn.disabled = true;
    loginBtn.textContent = "Ingresando...";
  }

  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: trimmed, password }),
    });
    if (!res.ok) {
      let errMsg = "Usuario o contraseña incorrectos";
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch (_ignore) {
        errMsg = `${errMsg} (HTTP ${res.status})`;
      }
      throw new Error(errMsg);
    }
    const user = await res.json();
    setCurrentUser(user);
    showToast(`Bienvenido, ${user.username}!`);
    return true;
  } catch (err) {
    console.error(err);
    showToast(err.message || "No se pudo iniciar sesión", "error");
    return false;
  } finally {
    if (!options.silent) {
      loginBtn.disabled = false;
      loginBtn.textContent = original;
    }
  }
}

async function registerUser({ username, email, password }) {
  const registerBtn = els.registerForm.querySelector(".primary-button");
  registerBtn.disabled = true;
  const originalText = registerBtn.textContent;
  registerBtn.textContent = "Creando cuenta...";

  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
    });

    if (!res.ok) {
      // Intentamos extraer error legible
      let errMsg = "No se pudo crear la cuenta";
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch (_ignore) {
        errMsg = `${errMsg} (HTTP ${res.status})`;
      }
      if (res.status === 409) {
        errMsg = errMsg || "Usuario o email ya registrado";
      }
      throw new Error(errMsg);
    }

    const user = await res.json();
    showToast("Cuenta creada con éxito 🎉 Iniciando sesión...");
    // Intentamos loguear automáticamente
    const finalUsername = user.username || username;
    document.getElementById("loginUsername").value = finalUsername;
    document.getElementById("loginPassword").value = password;
    const loggedIn = await loginUser(finalUsername, password, { silent: true });

    if (!loggedIn) {
      showToast("Cuenta creada. Inicia sesión con tus credenciales.", "error");
      switchAuthTab("login");
      els.authView.scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || "No se pudo crear la cuenta", "error");
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = originalText;
  }
}

async function fetchMeals() {
  if (!state.currentUser) return;
  try {
    const params = new URLSearchParams({
      user_id: state.currentUser.id,
      day: state.today,
    });
    const res = await fetch(`${API_BASE}/meals?${params.toString()}`);
    if (!res.ok) throw new Error("No se pudo obtener comidas");
    state.meals = await res.json();
    renderMeals();
  } catch (err) {
    console.error(err);
    showToast("Error al cargar las comidas", "error");
  }
}

async function fetchDailyTotals() {
  if (!state.currentUser) return;
  try {
    const params = new URLSearchParams({
      user_id: state.currentUser.id,
      day: state.today,
    });
    const res = await fetch(`${API_BASE}/meals/daily-totals?${params.toString()}`);
    if (!res.ok) throw new Error("No se pudo obtener calorías totales");
    const data = await res.json();
    const total =
      data?.[0]?.total_kcal ??
      state.meals.reduce(
        (acc, meal) => acc + (meal.quantity || 0) * (meal.calories_per_unit || 0),
        0,
      );
    renderDailyTotal(total);
  } catch (err) {
    console.error(err);
    showToast("No se pudieron calcular las calorías", "error");
  }
}

function renderDailyTotal(total) {
  const formatted = Math.round(total ?? 0);
  els.dailyTotal.textContent = `${formatted} kcal`;
}

function renderMeals() {
  if (!state.meals.length) {
    els.mealsList.innerHTML =
      '<div class="muted">Aún no registraste comidas hoy. ¡Empieza ahora!</div>';
    return;
  }

  const items = state.meals
    .map((meal) => {
      const kcal = Math.round((meal.quantity || 0) * (meal.calories_per_unit || 0));
      const quantityLabel = `${meal.quantity ?? 0} ${meal.unit_label ?? ""}`.trim();
      const timeLabel = meal.eaten_at
        ? new Date(meal.eaten_at).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Hora no registrada";

      const mealTypeLabel =
        mealTypeLabels[meal.meal_type?.toLowerCase()] || meal.meal_type || "Comida";
      return `
        <div class="meal-row">
          <div>
            <div class="meal-name">${meal.food_name}</div>
            <div class="meal-meta">
              <span class="badge">${mealTypeLabel}</span>
              <span>${quantityLabel}</span>
              <span>${timeLabel}</span>
            </div>
          </div>
          <div class="meal-calories">${kcal} kcal</div>
          <div class="meal-actions">
            <button class="icon-button" data-edit="${meal.id}">✏️</button>
            <button class="icon-button danger" data-delete="${meal.id}">🗑️</button>
          </div>
        </div>
      `;
    })
    .join("");

  els.mealsList.innerHTML = items;
  els.mealsList.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const meal = state.meals.find((m) => m.id === Number(btn.dataset.edit));
      if (meal) startEditMeal(meal);
    });
  });
  els.mealsList.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mealId = Number(btn.dataset.delete);
      if (Number.isFinite(mealId)) deleteMeal(mealId);
    });
  });
}

async function searchFoods(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    els.searchResults.innerHTML = "";
    return;
  }

  try {
    const params = new URLSearchParams({ q: trimmed });
    const res = await fetch(`${API_BASE}/foods?${params.toString()}`);
    if (!res.ok) throw new Error("No se pudo buscar alimentos");
    const foods = await res.json();
    renderSearchResults(foods);
  } catch (err) {
    console.error(err);
    showToast("No se pudo buscar alimentos", "error");
  }
}

function renderSearchResults(foods) {
  if (!foods?.length) {
    els.searchResults.innerHTML =
      '<div class="muted">Sin resultados. Prueba con otro término.</div>';
    return;
  }

  const items = foods
    .map(
      (food, index) => `
      <div class="search-item">
        <div class="details">
          <strong>${food.name}</strong>
          <span class="muted">${food.calories_per_unit} kcal por ${food.unit_label}</span>
        </div>
        <button class="primary-button" data-food-index="${index}">Usar</button>
      </div>
    `,
    )
    .join("");

  els.searchResults.innerHTML = items;
  els.searchResults.querySelectorAll("button[data-food-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const food = foods[Number(btn.dataset.foodIndex)];
      prefillMealForm(food);
      toggleAddMeal(true);
      showToast(`${food.name} listo para agregar`);
    });
  });
}

function prefillMealForm(food) {
  selectedFoodId = food.id || null;
  document.getElementById("mealFoodName").value = food.name || "";
  document.getElementById("mealUnit").value = food.unit_label || "porción";
  document.getElementById("mealCalories").value = food.calories_per_unit || "";
  document.getElementById("mealQuantity").value = 1;
}

function toggleAddMeal(forceOpen) {
  const willOpen =
    typeof forceOpen === "boolean"
      ? forceOpen
      : els.addMealCard.classList.contains("hidden");
  els.addMealCard.classList.toggle("hidden", !willOpen);
}

function resetMealForm() {
  selectedFoodId = null;
  els.addMealForm.reset();
  document.getElementById("mealUnit").value = "porción";
  endEditMode();
}

async function submitMeal(event) {
  event.preventDefault();
  if (!state.currentUser) {
    showToast("Inicia sesión primero", "error");
    return;
  }

  const form = new FormData(els.addMealForm);
  const payload = {
    user_id: state.currentUser.id,
    meal_type: form.get("meal_type"),
    food_name: form.get("food_name"),
    quantity: Number(form.get("quantity")),
    unit_label: form.get("unit_label") || "porción",
    calories_per_unit: Number(form.get("calories_per_unit")),
    food_id: selectedFoodId,
  };

  const eatenAt = form.get("eaten_at");
  if (eatenAt) payload.eaten_at = new Date(eatenAt).toISOString();

  if (!payload.food_name || !payload.meal_type || !payload.quantity || !payload.calories_per_unit) {
    showToast("Completa todos los campos obligatorios", "error");
    return;
  }

  try {
    const isEditing = Boolean(state.editingMealId);
    const url = isEditing
      ? `${API_BASE}/meals/${state.editingMealId}`
      : `${API_BASE}/meals`;
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "No se pudo guardar la comida");
    }

    showToast(isEditing ? "Comida actualizada ✅" : "Comida agregada ✅");
    resetMealForm();
    endEditMode();
    await fetchMeals();
    await fetchDailyTotals();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error al guardar la comida", "error");
  }
}

function bindEvents() {
  els.loginTab.addEventListener("click", () => switchAuthTab("login"));
  els.registerTab.addEventListener("click", () => switchAuthTab("register"));
  els.toRegister.addEventListener("click", () => switchAuthTab("register"));
  els.toLogin.addEventListener("click", () => switchAuthTab("login"));
  els.backToLogin.addEventListener("click", () => switchAuthTab("login"));

  els.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    loginUser(username, password);
  });

  els.registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirm = document.getElementById("registerPasswordConfirm").value;

    if (!username || !email || !password) {
      showToast("Completa usuario, email y contraseña", "error");
      return;
    }

    if (password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }

    if (password !== confirm) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    registerUser({ username, email, password });
  });

  els.logoutBtn.addEventListener("click", () => {
    setCurrentUser(null);
  });

  els.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    searchFoods(els.searchInput.value);
  });

  els.searchInput.addEventListener("input", (e) => {
    if (e.target.value.length >= 2) {
      searchFoods(e.target.value);
    } else {
      els.searchResults.innerHTML = "";
    }
  });

  els.toggleAddMeal.addEventListener("click", () => toggleAddMeal());
  els.cancelAddMeal.addEventListener("click", () => {
    endEditMode();
    toggleAddMeal(false);
  });
  els.resetMealForm.addEventListener("click", resetMealForm);
  els.addMealForm.addEventListener("submit", submitMeal);
  els.refreshData.addEventListener("click", loadDashboard);

  els.addFoodForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitFood();
  });
}

async function loadDashboard() {
  await fetchMeals();
  await fetchDailyTotals();
}

async function submitFood() {
  if (!state.currentUser) {
    showToast("Inicia sesión para agregar alimentos", "error");
    return;
  }

  const name = els.foodName.value.trim();
  const unit_label = els.foodUnit.value.trim() || "porción";
  const calories = Number(els.foodCalories.value);

  if (!name || !calories) {
    showToast("Completa nombre y calorías", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/foods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        unit_label,
        calories_per_unit: calories,
        created_by_user_id: state.currentUser.id,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "No se pudo guardar el alimento");
    }

    els.addFoodForm.reset();
    els.foodUnit.value = "porción";
    showToast("Alimento agregado al catálogo ✅");

    if (els.searchInput.value.trim()) {
      searchFoods(els.searchInput.value);
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error al agregar alimento", "error");
  }
}

function bootstrap() {
  bindEvents();
  setTodayLabel();
  const saved = localStorage.getItem("foodlog_user");
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user?.id) setCurrentUser(user);
    } catch (err) {
      console.error(err);
      localStorage.removeItem("foodlog_user");
    }
  } else {
    switchAuthTab("login");
  }
}

bootstrap();

function startEditMeal(meal) {
  state.editingMealId = meal.id;
  toggleAddMeal(true);
  document.getElementById("mealFoodName").value = meal.food_name || "";
  document.getElementById("mealUnit").value = meal.unit_label || "porción";
  document.getElementById("mealCalories").value = meal.calories_per_unit || "";
  document.getElementById("mealQuantity").value = meal.quantity || 1;
  document.getElementById("mealType").value = meal.meal_type || "almuerzo";
  if (meal.eaten_at) {
    document.getElementById("mealDate").value = formatDateTimeLocal(meal.eaten_at);
  }
  const submitBtn = els.addMealForm.querySelector(".primary-button");
  submitBtn.textContent = "Guardar cambios";
}

function endEditMode() {
  state.editingMealId = null;
  const submitBtn = els.addMealForm.querySelector(".primary-button");
  if (submitBtn) submitBtn.textContent = "Agregar";
}

function formatDateTimeLocal(dateStr) {
  const date = new Date(dateStr);
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return iso;
}

async function deleteMeal(mealId) {
  if (!state.currentUser) {
    showToast("Inicia sesión primero", "error");
    return;
  }
  const ok = window.confirm("¿Eliminar este registro?");
  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE}/meals/${mealId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "No se pudo eliminar");
    }
    showToast("Comida eliminada 🗑️");
    await fetchMeals();
    await fetchDailyTotals();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error al eliminar", "error");
  }
}
