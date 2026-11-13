// Base de datos de productos en localStorage
let productos = JSON.parse(localStorage.getItem('kiosco_productos')) || [
  { id: 1, nombre: "Gaseosa Cola 1.5L", actual: 4, objetivo: 12, precio: 1800 },
  { id: 2, nombre: "Galletitas Chocolate", actual: 15, objetivo: 15, precio: 950 },
  { id: 3, nombre: "Alfajor Dulce de Leche", actual: 2, objetivo: 24, precio: 600 }
];

// Lista de correos y usuarios autorizados directamente desde la página
let usuariosAutorizados = JSON.parse(localStorage.getItem('kiosco_usuarios')) || {
  empleados: [
    { nombre: "Juan Pérez", correo: "juan.empleado@kiosco.com" },
    { nombre: "María Gómez", correo: "maria.empleado@kiosco.com" }
  ],
  proveedores: [
    { nombre: "Distribuidora Sur", correo: "ventas@distsur.com" },
    { nombre: "Mayorista El Sol", correo: "pedidos@elsol.com" }
  ]
};

let historial = JSON.parse(localStorage.getItem('kiosco_historial')) || [];
let rolActual = null;
let usuarioActual = "";

// Credenciales del Jefe
const credencialesJefe = {
  correo: "jefe@kiosco.com",
  pass: "admin123",
  codigoEmpleadoGeneral: "EMP-8842",
  codigoProveedorGeneral: "PRV-1930"
};

const modalBootstrap = new bootstrap.Modal(document.getElementById('modalProducto'));

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  configurarEventosLogin();
  configurarEventosDashboard();
  renderizarListaAutorizados();
});

function configurarEventosLogin() {
  // 1. Login Jefe
  document.getElementById("form-login-jefe").addEventListener("submit", (e) => {
    e.preventDefault();
    const mail = document.getElementById("jefe-email").value.trim();
    const pass = document.getElementById("jefe-pass").value;

    if (mail === credencialesJefe.correo && pass === credencialesJefe.pass) {
      iniciarSesion("jefe", "Jefe / Administrador");
    } else {
      mostrarErrorLogin("Correo o contraseña de Jefe incorrectos.");
    }
  });

  // 2. Login Empleado (Por correo registrado O por código general)
  document.getElementById("form-login-empleado").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombreInput = document.getElementById("emp-nombre").value.trim();
    const credencialInput = document.getElementById("emp-credencial").value.trim();

    // Buscar si el correo está autorizado en la lista del Jefe o si coincide el código general
    const empleadoEncontrado = usuariosAutorizados.empleados.find(emp => emp.correo.toLowerCase() === credencialInput.toLowerCase());
    const esCodigoValido = credencialInput.toUpperCase() === credencialesJefe.codigoEmpleadoGeneral;

    if (empleadoEncontrado || esCodigoValido) {
      const nombreFinal = empleadoEncontrado ? empleadoEncontrado.nombre : nombreInput;
      iniciarSesion("empleado", `Empleado (${nombreFinal})`);
    } else {
      mostrarErrorLogin("El correo o código ingresado no está autorizado por el Jefe.");
    }
  });

  // 3. Login Proveedor (Por correo registrado O por código general)
  document.getElementById("form-login-proveedor").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombreInput = document.getElementById("prov-nombre").value.trim();
    const credencialInput = document.getElementById("prov-credencial").value.trim();

    const proveedorEncontrado = usuariosAutorizados.proveedores.find(prov => prov.correo.toLowerCase() === credencialInput.toLowerCase());
    const esCodigoValido = credencialInput.toUpperCase() === credencialesJefe.codigoProveedorGeneral;

    if (proveedorEncontrado || esCodigoValido) {
      const nombreFinal = proveedorEncontrado ? proveedorEncontrado.nombre : nombreInput;
      iniciarSesion("proveedor", `Proveedor (${nombreFinal})`);
    } else {
      mostrarErrorLogin("El correo o código de proveedor no está autorizado por el Jefe.");
    }
  });
}

function iniciarSesion(rol, usuario) {
  rolActual = rol;
  usuarioActual = usuario;

  document.getElementById("login-alert").classList.add("d-none");
  document.getElementById("screen-login").classList.add("d-none");
  document.getElementById("screen-dashboard").classList.remove("d-none");

  document.getElementById("select-rol").value = rol;

  registrarHistorial(`Inicio de sesión: ${usuarioActual}.`);
  actualizarVistaPorRol();
  renderizarTabla();
}

function configurarEventosDashboard() {
  // Atajo de desarrollador
  document.getElementById("select-rol").addEventListener("change", (e) => {
    rolActual = e.target.value;
    actualizarVistaPorRol();
    renderizarTabla();
  });

  // Cerrar sesión
  document.getElementById("btn-logout").addEventListener("click", () => {
    rolActual = null;
    document.getElementById("screen-dashboard").classList.add("d-none");
    document.getElementById("screen-login").classList.remove("d-none");
  });

  // Guardar producto
  document.getElementById("form-producto").addEventListener("submit", (e) => {
    e.preventDefault();
    guardarProducto();
  });

  // Formulario del Jefe para agregar nuevos correos autorizados
  const formNuevoUsuario = document.getElementById("form-nuevo-usuario");
  if (formNuevoUsuario) {
    formNuevoUsuario.addEventListener("submit", (e) => {
      e.preventDefault();
      const tipo = document.getElementById("nuevo-tipo-rol").value;
      const nombre = document.getElementById("nuevo-nombre").value.trim();
      const correo = document.getElementById("nuevo-correo").value.trim();

      if (tipo === "empleado") {
        usuariosAutorizados.empleados.push({ nombre, correo });
      } else {
        usuariosAutorizados.proveedores.push({ nombre, correo });
      }

      sincronizarStorage();
      renderizarListaAutorizados();
      formNuevoUsuario.reset();
      alert(`¡${nombre} fue autorizado correctamente en la página!`);
    });
  }
}

// Guardar en localStorage
function sincronizarStorage() {
  localStorage.setItem('kiosco_productos', JSON.stringify(productos));
  localStorage.setItem('kiosco_usuarios', JSON.stringify(usuariosAutorizados));
  localStorage.setItem('kiosco_historial', JSON.stringify(historial));
}

// Renderizar tabla de inventario
function renderizarTabla() {
  const tbody = document.getElementById("tabla-productos");
  tbody.innerHTML = "";

  productos.forEach(prod => {
    const necesitaStock = prod.actual < prod.objetivo;
    const cuantosPedir = necesitaStock ? prod.objetivo - prod.actual : 0;

    if (rolActual === "proveedor" && !necesitaStock) return;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="fw-bold">${prod.nombre}</td>
      <td><span class="badge ${prod.actual === 0 ? 'bg-danger' : 'bg-secondary'}">${prod.actual} u.</span></td>
      <td>${prod.objetivo} u.</td>
      <td>$${Number(prod.precio).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
      <td>
        ${necesitaStock 
          ? `<span class="badge bg-warning text-dark"><i class="fa-solid fa-triangle-exclamation"></i> Sí, solicitar</span>` 
          : `<span class="badge bg-success"><i class="fa-solid fa-check"></i> Stock Completo</span>`}
      </td>
      <td class="fw-bold text-primary">${cuantosPedir > 0 ? `${cuantosPedir} u.` : '-'}</td>
      <td class="text-center col-acciones">
        ${obtenerBotonesAcciones(prod)}
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("total-productos").textContent = `${productos.length} Productos`;
}

function obtenerBotonesAcciones(prod) {
  if (rolActual === "proveedor") return `<span class="text-muted small">Solo Lectura</span>`;
  
  if (rolActual === "empleado") {
    return `
      <button class="btn btn-sm btn-outline-primary me-1" onclick="ajustarStock(${prod.id}, 1)">+1</button>
      <button class="btn btn-sm btn-outline-secondary me-1" onclick="ajustarStock(${prod.id}, -1)">-1</button>
      <button class="btn btn-sm btn-outline-warning" onclick="abrirEditar(${prod.id})"><i class="fa-solid fa-pen"></i></button>
    `;
  }

  return `
    <button class="btn btn-sm btn-warning me-1" onclick="abrirEditar(${prod.id})"><i class="fa-solid fa-pen"></i></button>
    <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${prod.id})"><i class="fa-solid fa-trash"></i></button>
  `;
}

// Renderizar la lista de usuarios autorizados que ve el Jefe
function renderizarListaAutorizados() {
  const contenedor = document.getElementById("lista-usuarios-autorizados");
  if (!contenedor) return;

  let html = "<ul class='list-group list-group-flush'>";
  
  usuariosAutorizados.empleados.forEach(emp => {
    html += `<li class='list-group-item d-flex justify-content-between align-items-center'>
      <span><i class='fa-solid fa-user-tie text-success me-2'></i><strong>${emp.nombre}</strong> (${emp.correo})</span>
      <span class='badge bg-success'>Empleado</span>
    </li>`;
  });

  usuariosAutorizados.proveedores.forEach(prov => {
    html += `<li class='list-group-item d-flex justify-content-between align-items-center'>
      <span><i class='fa-solid fa-truck text-warning me-2'></i><strong>${prov.nombre}</strong> (${prov.correo})</span>
      <span class='badge bg-warning text-dark'>Proveedor</span>
    </li>`;
  });

  html += "</ul>";
  contenedor.innerHTML = html;
}

function guardarProducto() {
  const id = document.getElementById("producto-id").value;
  const nombre = document.getElementById("prod-nombre").value;
  const actual = parseInt(document.getElementById("prod-actual").value);
  const objetivo = parseInt(document.getElementById("prod-objetivo").value);
  const precio = parseFloat(document.getElementById("prod-precio").value);

  if (id) {
    const index = productos.findIndex(p => p.id == id);
    productos[index] = { id: parseInt(id), nombre, actual, objetivo, precio };
    registrarHistorial(`Producto modificado: "${nombre}" por (${usuarioActual})`);
  } else {
    const nuevoProd = { id: Date.now(), nombre, actual, objetivo, precio };
    productos.push(nuevoProd);
    registrarHistorial(`Nuevo producto agregado: "${nombre}" por (${usuarioActual})`);
  }

  sincronizarStorage();
  modalBootstrap.hide();
  limpiarFormulario();
  renderizarTabla();
}

function abrirEditar(id) {
  const prod = productos.find(p => p.id === id);
  document.getElementById("producto-id").value = prod.id;
  document.getElementById("prod-nombre").value = prod.nombre;
  document.getElementById("prod-actual").value = prod.actual;
  document.getElementById("prod-objetivo").value = prod.objetivo;
  document.getElementById("prod-precio").value = prod.precio;

  document.getElementById("prod-nombre").disabled = (rolActual === "empleado");
  document.getElementById("prod-precio").disabled = (rolActual === "empleado");

  document.getElementById("modalProductoLabel").textContent = "Editar Producto";
  modalBootstrap.show();
}

function eliminarProducto(id) {
  const prod = productos.find(p => p.id === id);
  if (confirm(`¿Eliminar producto "${prod.nombre}"?`)) {
    productos = productos.filter(p => p.id !== id);
    registrarHistorial(`Producto eliminado: "${prod.nombre}"`);
    sincronizarStorage();
    renderizarTabla();
  }
}

function ajustarStock(id, cambio) {
  const prod = productos.find(p => p.id === id);
  if (prod.actual + cambio >= 0) {
    prod.actual += cambio;
    registrarHistorial(`Stock de "${prod.nombre}" ajustado (${cambio > 0 ? '+' + cambio : cambio})`);
    sincronizarStorage();
    renderizarTabla();
  }
}

function actualizarVistaPorRol() {
  const banner = document.getElementById("rol-descripcion");
  const btnNuevo = document.getElementById("btn-nuevo-producto");
  const seccionHistorial = document.getElementById("seccion-historial");
  const panelGestion = document.getElementById("panel-gestion-usuarios");

  if (rolActual === "jefe") {
    banner.textContent = "Modo Jefe: Tienes control total y administración de usuarios.";
    btnNuevo.style.display = "block";
    if(seccionHistorial) seccionHistorial.style.display = "block";
    if(panelGestion) panelGestion.classList.remove("d-none");
  } else if (rolActual === "empleado") {
    banner.textContent = "Modo Empleado: Puedes ajustar cantidades de stock y gestionar faltantes.";
    btnNuevo.style.display = "block";
    if(seccionHistorial) seccionHistorial.style.display = "none";
    if(panelGestion) panelGestion.classList.add("d-none");
  } else if (rolActual === "proveedor") {
    banner.textContent = "Modo Proveedor: Vista exclusiva de productos solicitados para reposición.";
    btnNuevo.style.display = "none";
    if(seccionHistorial) seccionHistorial.style.display = "none";
    if(panelGestion) panelGestion.classList.add("d-none");
  }
}

function mostrarErrorLogin(msj) {
  const alertBox = document.getElementById("login-alert");
  alertBox.textContent = msj;
  alertBox.classList.remove("d-none");
}

function registrarHistorial(mensaje) {
  const tiempo = new Date().toLocaleTimeString();
  historial.unshift(`[${tiempo}] - ${mensaje}`);
  if (historial.length > 20) historial.pop();
  sincronizarStorage();

  const lista = document.getElementById("lista-historial");
  if (lista) {
    lista.innerHTML = historial.slice(0, 5).map(item => `<li class="list-group-item bg-transparent">${item}</li>`).join("");
  }
}

function limpiarFormulario() {
  document.getElementById("form-producto").reset();
  document.getElementById("producto-id").value = "";
  document.getElementById("prod-nombre").disabled = false;
  document.getElementById("prod-precio").disabled = false;
  document.getElementById("modalProductoLabel").textContent = "Añadir Nuevo Producto";
}