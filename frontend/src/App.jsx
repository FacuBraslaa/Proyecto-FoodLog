import { useEffect, useMemo, useState } from "react";
import logo from "./assets/logo.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const mealTypeLabels = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Snack / Merienda",
  cena: "Cena",
};

const emptyMeal = {
  food_name: "",
  meal_type: "almuerzo",
  quantity: "",
  unit_label: "porción",
  calories_per_unit: "",
  eaten_at: "",
};

const emptyFood = {
  name: "",
  unit_label: "porción",
  calories_per_unit: "",
};

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("foodlog_user");
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (_e) {
      localStorage.removeItem("foodlog_user");
      return null;
    }
  });

  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [mealForm, setMealForm] = useState(emptyMeal);
  const [foodForm, setFoodForm] = useState(emptyFood);
  const [editingMealId, setEditingMealId] = useState(null);
  const [authTab, setAuthTab] = useState("login");

  const [meals, setMeals] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState("");
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const todayLabel = useMemo(() => {
    const [y, m, d] = today.split("-").map(Number);
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(y, m - 1, d));
  }, [today]);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 3200);
  }

  async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      let msg = `Error HTTP ${res.status}`;
      try {
        const data = await res.json();
        msg = data.error || msg;
      } catch (_e) {
        // ignore
      }
      throw new Error(msg);
    }
    return res.json();
  }

  async function handleRegister(e) {
    e.preventDefault();
    const { username, email, password, confirm } = registerForm;
    if (!username || !email || !password) {
      showToast("Completa usuario, email y contraseña", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    setLoading(true);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });
      showToast("Cuenta creada con éxito 🎉 Iniciando sesión...");
      setAuthTab("login");
      await handleLoginDirect(username, password, true);
    } catch (err) {
      showToast(err.message || "No se pudo crear la cuenta", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const { username, password } = loginForm;
    await handleLoginDirect(username, password, false);
  }

  async function handleLoginDirect(username, password, silent) {
    if (!username || !password) {
      showToast("Ingresa usuario y contraseña", "error");
      return false;
    }
    setLoading(true);
    try {
      const data = await api("/users/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(data);
      localStorage.setItem("foodlog_user", JSON.stringify(data));
      showToast(`Bienvenido, ${data.username}`);
      setLoginForm({ username: "", password: "" });
      return true;
    } catch (err) {
      showToast(err.message || "No se pudo iniciar sesión", "error");
      if (!silent) {
        setUser(null);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setMeals([]);
    setDailyTotal(0);
    localStorage.removeItem("foodlog_user");
  }

  async function loadDashboard() {
    await Promise.all([fetchMeals(), fetchDailyTotals()]);
  }

  async function fetchMeals() {
    if (!user) return;
    try {
      const params = new URLSearchParams({ user_id: user.id, day: today });
      const data = await api(`/meals?${params.toString()}`);
      setMeals(data);
    } catch (err) {
      showToast(err.message || "Error al cargar comidas", "error");
    }
  }

  async function fetchDailyTotals() {
    if (!user) return;
    try {
      const params = new URLSearchParams({ user_id: user.id, day: today });
      const data = await api(`/meals/daily-totals?${params.toString()}`);
      const total =
        data?.[0]?.total_kcal ??
        meals.reduce(
          (acc, m) => acc + (m.quantity || 0) * (m.calories_per_unit || 0),
          0,
        );
      setDailyTotal(Math.round(total));
    } catch (err) {
      showToast(err.message || "No se pudieron calcular las calorías", "error");
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const params = new URLSearchParams({ q: query.trim() });
      const data = await api(`/foods?${params.toString()}`);
      setSearchResults(data);
    } catch (err) {
      showToast(err.message || "No se pudo buscar alimentos", "error");
    }
  }

  function selectFood(food) {
    setMealForm({
      ...mealForm,
      food_name: food.name,
      unit_label: food.unit_label,
      calories_per_unit: food.calories_per_unit,
      quantity: 1,
    });
    showToast(`${food.name} listo para agregar`);
  }

  async function handleAddFood(e) {
    e.preventDefault();
    if (!user) {
      showToast("Inicia sesión para agregar alimentos", "error");
      return;
    }
    if (!foodForm.name || !foodForm.calories_per_unit) {
      showToast("Completa nombre y calorías", "error");
      return;
    }
    try {
      await api("/foods", {
        method: "POST",
        body: JSON.stringify({
          ...foodForm,
          calories_per_unit: Number(foodForm.calories_per_unit),
          created_by_user_id: user.id,
        }),
      });
      showToast("Alimento agregado ✅");
      setFoodForm(emptyFood);
      if (query.trim()) {
        handleSearch(new Event("submit"));
      }
    } catch (err) {
      showToast(err.message || "No se pudo agregar el alimento", "error");
    }
  }

  async function handleMealSubmit(e) {
    e.preventDefault();
    if (!user) {
      showToast("Inicia sesión primero", "error");
      return;
    }
    if (
      !mealForm.food_name ||
      !mealForm.meal_type ||
      !mealForm.quantity ||
      !mealForm.calories_per_unit
    ) {
      showToast("Completa todos los campos obligatorios", "error");
      return;
    }

    const payload = {
      user_id: user.id,
      food_name: mealForm.food_name,
      meal_type: mealForm.meal_type,
      quantity: Number(mealForm.quantity),
      unit_label: mealForm.unit_label || "porción",
      calories_per_unit: Number(mealForm.calories_per_unit),
    };
    if (mealForm.eaten_at) {
      payload.eaten_at = new Date(mealForm.eaten_at).toISOString();
    }

    try {
      const path = editingMealId ? `/meals/${editingMealId}` : "/meals";
      const method = editingMealId ? "PUT" : "POST";
      await api(path, { method, body: JSON.stringify(payload) });
      showToast(editingMealId ? "Comida actualizada ✅" : "Comida agregada ✅");
      setMealForm(emptyMeal);
      setEditingMealId(null);
      await loadDashboard();
    } catch (err) {
      showToast(err.message || "No se pudo guardar la comida", "error");
    }
  }

  function startEdit(meal) {
    setEditingMealId(meal.id);
    setMealForm({
      food_name: meal.food_name,
      meal_type: meal.meal_type,
      quantity: meal.quantity,
      unit_label: meal.unit_label,
      calories_per_unit: meal.calories_per_unit,
      eaten_at: meal.eaten_at ? formatLocal(meal.eaten_at) : "",
    });
  }

  function cancelEdit() {
    setEditingMealId(null);
    setMealForm(emptyMeal);
  }

  async function deleteMeal(id) {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await api(`/meals/${id}`, { method: "DELETE" });
      showToast("Comida eliminada 🗑️");
      await loadDashboard();
    } catch (err) {
      showToast(err.message || "No se pudo eliminar", "error");
    }
  }

  return (
    <div className="page">
      <div className="background-layer" />
      {user ? (
        <header className="app-header">
          <div className="brand">
            <div className="brand-icon">
              <img src={logo} alt="FoodLog" className="logo-mark" />
            </div>
            <div>
              <div className="brand-name">FoodLog</div>
              <div className="brand-sub">Hola, {user.username}</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="ghost-button inverse" onClick={logout}>
              Cerrar Sesión
            </button>
          </div>
        </header>
      ) : null}

      <main className={`app-shell ${user ? "with-header" : "auth-mode"}`}>
        {!user ? (
          <section className="auth-card">
            {authTab === "register" ? (
              <button className="auth-back" type="button" onClick={() => setAuthTab("login")}>
                ← Volver
              </button>
            ) : null}
            {authTab === "login" ? <div className="auth-wordmark">FoodLog</div> : null}
            <div className="auth-box">
              <div className="auth-icon">
                <img src={logo} alt="FoodLog" className="logo-mark" />
              </div>
              <div className="auth-heading">
                <h1>{authTab === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</h1>
                <p className="muted">
                  {authTab === "login"
                    ? "Accede a tu cuenta de FoodLog"
                    : "Regístrate en FoodLog"}
                </p>
              </div>

              {authTab === "login" ? (
                <form className="auth-form" onSubmit={handleLogin}>
                  <label className="auth-field">
                    <span>Usuario</span>
                    <input
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      placeholder="Ingresa tu usuario"
                      required
                    />
                  </label>

                  <label className="auth-field">
                    <span>Contraseña</span>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                  </label>

                  <button className="auth-button" type="submit" disabled={loading}>
                    {loading ? "Ingresando..." : "Iniciar Sesión"}
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleRegister}>
                  <label className="auth-field">
                    <span>Usuario</span>
                    <input
                      value={registerForm.username}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, username: e.target.value })
                      }
                      placeholder="Elige un nombre de usuario"
                      required
                    />
                  </label>

                  <label className="auth-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      placeholder="tu@email.com"
                      required
                    />
                  </label>

                  <label className="auth-field">
                    <span>Contraseña</span>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, password: e.target.value })
                      }
                      placeholder="Crea una contraseña"
                      required
                    />
                  </label>

                  <label className="auth-field">
                    <span>Confirmar Contraseña</span>
                    <input
                      type="password"
                      value={registerForm.confirm}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, confirm: e.target.value })
                      }
                      placeholder="Confirma tu contraseña"
                      required
                    />
                  </label>

                  <button className="auth-button" type="submit" disabled={loading}>
                    {loading ? "Creando..." : "Crear Cuenta"}
                  </button>
                </form>
              )}

              <div className="auth-switch">
                <span>{authTab === "login" ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}</span>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setAuthTab(authTab === "login" ? "register" : "login")}
                >
                  {authTab === "login" ? "Regístrate" : "Inicia sesión"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="dashboard">
            <div className="grid">
              <div className="card hero-card">
                <div className="hero-header">
                  <h2>¿Qué comiste hoy?</h2>
                  <p className="muted">Busca o agrega tus alimentos</p>
                </div>
                <form className="search-bar" onSubmit={handleSearch}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar alimento (ej: manzana, pollo, arroz...)"
                  />
                  <button className="search-button" type="submit">
                    🔍
                  </button>
                </form>
                <div className="search-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      document.getElementById("mealFormCard")?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    + Agregar Comida Manualmente
                  </button>
                </div>
                <div className="search-results">
                  {searchResults.length === 0 ? (
                    <p className="muted">Escribe para buscar en el catálogo</p>
                  ) : (
                    searchResults.map((food) => (
                      <div className="search-item" key={food.id}>
                        <div className="details">
                          <strong>{food.name}</strong>
                          <span className="muted">
                            {food.calories_per_unit} kcal por {food.unit_label}
                          </span>
                        </div>
                        <button className="primary-button" onClick={() => selectFood(food)}>
                          Usar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card collapsible" id="mealFormCard">
                <div className="card-header">
                  <div>
                    <p className="eyebrow">Agregar Nueva Comida</p>
                    <h3>Registra tu comida en segundos</h3>
                  </div>
                  {editingMealId ? (
                    <button className="ghost-button" onClick={cancelEdit}>
                      Cancelar edición
                    </button>
                  ) : null}
                </div>
                <form className="form-grid two-col" onSubmit={handleMealSubmit}>
                  <label className="field">
                    <span>Nombre del alimento</span>
                    <input
                      value={mealForm.food_name}
                      onChange={(e) => setMealForm({ ...mealForm, food_name: e.target.value })}
                      placeholder="Ej: Ensalada César"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Tipo de comida</span>
                    <select
                      value={mealForm.meal_type}
                      onChange={(e) => setMealForm({ ...mealForm, meal_type: e.target.value })}
                      required
                    >
                      <option value="desayuno">Desayuno</option>
                      <option value="almuerzo">Almuerzo</option>
                      <option value="cena">Cena</option>
                      <option value="merienda">Snack / Merienda</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Cantidad</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={mealForm.quantity}
                      onChange={(e) => setMealForm({ ...mealForm, quantity: e.target.value })}
                      placeholder="Ej: 200"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Unidad</span>
                    <input
                      value={mealForm.unit_label}
                      onChange={(e) => setMealForm({ ...mealForm, unit_label: e.target.value })}
                      placeholder="Ej: g, porción, taza"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Calorías por unidad</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={mealForm.calories_per_unit}
                      onChange={(e) =>
                        setMealForm({ ...mealForm, calories_per_unit: e.target.value })
                      }
                      placeholder="Ej: 350"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Fecha y hora (opcional)</span>
                    <input
                      type="datetime-local"
                      value={mealForm.eaten_at}
                      onChange={(e) => setMealForm({ ...mealForm, eaten_at: e.target.value })}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="ghost-button" type="button" onClick={cancelEdit}>
                      Limpiar
                    </button>
                    <button className="primary-button" type="submit">
                      {editingMealId ? "Guardar cambios" : "Agregar"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="card totals-card">
                <p className="eyebrow">Calorías Totales del Día</p>
                <p className="muted">{todayLabel}</p>
                <div className="kcal-number">{dailyTotal} kcal</div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <p className="eyebrow">Nuevo alimento</p>
                    <h3>Agrega al catálogo</h3>
                  </div>
                </div>
                <form className="form-grid two-col" onSubmit={handleAddFood}>
                  <label className="field">
                    <span>Nombre</span>
                    <input
                      value={foodForm.name}
                      onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                      placeholder="Ej: Pan integral"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Unidad</span>
                    <input
                      value={foodForm.unit_label}
                      onChange={(e) => setFoodForm({ ...foodForm, unit_label: e.target.value })}
                      placeholder="Ej: rebanada (40 g)"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Calorías por unidad</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={foodForm.calories_per_unit}
                      onChange={(e) =>
                        setFoodForm({ ...foodForm, calories_per_unit: e.target.value })
                      }
                      placeholder="Ej: 90"
                      required
                    />
                  </label>
                  <div className="form-actions">
                    <button className="ghost-button" type="reset" onClick={() => setFoodForm(emptyFood)}>
                      Limpiar
                    </button>
                    <button className="primary-button" type="submit">
                      Guardar alimento
                    </button>
                  </div>
                </form>
              </div>

              <div className="card meals-card">
                <div className="card-header">
                  <div>
                    <p className="eyebrow">Comidas Registradas Hoy</p>
                    <h3>Tu día, de un vistazo</h3>
                  </div>
                  <button className="ghost-button" onClick={loadDashboard}>
                    Actualizar
                  </button>
                </div>
                <div className="meals-list">
                  {meals.length === 0 ? (
                    <div className="muted">Aún no registraste comidas hoy.</div>
                  ) : (
                    meals.map((meal) => {
                      const kcal = Math.round(
                        (meal.quantity || 0) * (meal.calories_per_unit || 0),
                      );
                      const quantityLabel = `${meal.quantity ?? 0} ${meal.unit_label ?? ""}`.trim();
                      const timeLabel = meal.eaten_at
                        ? new Date(meal.eaten_at).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Hora no registrada";
                      const label =
                        mealTypeLabels[meal.meal_type?.toLowerCase()] ||
                        meal.meal_type ||
                        "Comida";
                      return (
                        <div className="meal-row" key={meal.id}>
                          <div>
                            <div className="meal-name">{meal.food_name}</div>
                            <div className="meal-meta">
                              <span className="badge">{label}</span>
                              <span>{quantityLabel}</span>
                              <span>{timeLabel}</span>
                            </div>
                          </div>
                          <div className="meal-calories">{kcal} kcal</div>
                          <div className="meal-actions">
                            <button className="icon-button" onClick={() => startEdit(meal)}>
                              ✏️
                            </button>
                            <button className="icon-button danger" onClick={() => deleteMeal(meal.id)}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {toast.message ? <div className={`toast ${toast.type}`}>{toast.message}</div> : null}
    </div>
  );
}

function formatLocal(dateStr) {
  const date = new Date(dateStr);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default App;
