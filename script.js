// script.js

// Paso 4.1: Configurar el mapa
// El mapa no se inicializa inmediatamente aquí, se hará cuando la pantalla del mapa sea visible.
let map; // Declarar el mapa globalmente para poder inicializarlo después
let myPieChart; // Variable para mantener la instancia del gráfico

// Referencias a los elementos DOM de las dos ventanas
const initialScreen = document.getElementById('initial-screen');
const mapScreen = document.getElementById('map-screen');
const exploreMapBtn = document.getElementById('explore-map-btn');
const backToHomeBtn = document.getElementById('back-to-home-btn');

// Referencias a elementos del panel de info y nueva sección inferior
const infoPanel = document.getElementById('info-panel');
const infoContent = document.getElementById('info-content');
const closeInfoPanelBtn = document.getElementById('close-info-panel');
const parkNamesList = document.getElementById('park-names-list'); 
const totalCapacitySpan = document.getElementById('total-capacity'); 
const capacityPieChartCanvas = document.getElementById('capacity-pie-chart'); 


// Paso 4.2: Definir los colores, íconos y clases CSS para los marcadores según el estado
const estadosParques = {
    "En Operación": { color: '#28a745', icon: '⚡', cssClass: 'operacion', description: 'Proyectos activos generando energía.' },
    "En Construcción / Concesión Definitiva Aprobada": { color: '#fd7e14', icon: '🏗️', cssClass: 'construccion', description: 'Parques en fase de edificación.' },
    "Recomendación Concesión Definitiva": { color: '#17a2b8', icon: '📄', cssClass: 'concesion-definitiva', description: 'Fase final de diseño antes de iniciar la construcción.' },
    "Procedimiento Concesión Provisional": { color: '#6f42c1', icon: '📝', cssClass: 'concesion-provisional', description: 'En proceso de aprobación final para iniciar la construcción.' },
    "Concesión Provisional": { color: '#007bff', icon: '⏳', cssClass: 'revision', description: 'Proyecto actualmente en evaluación o revisión.' },
    "Paralizado": { color: '#dc3545', icon: '⛔', cssClass: 'paralizado', description: 'Proyectos detenidos por razones técnicas o legales.' },
    "En Mantenimiento": { color: '#ffc107', icon: '🔧', cssClass: 'mantenimiento', description: 'Proyectos en fase de ajustes o reparación.' },
    "Otro": { color: '#6c757d', icon: '❓', cssClass: 'otro', description: 'Estado no especificado o desconocido.' }
};

let allParquesData = []; // Para almacenar todos los datos de los parques cargados
let mapMarkers = [];     // Para almacenar los marcadores antes de añadirlos al mapa

// --- Lógica de la funcionalidad del mapa (se inicializa solo cuando se solicita) ---
function initializeMap() {
    if (!map) { // Solo inicializar si no ha sido inicializado ya
        map = L.map('map', {
            zoomControl: false // Deshabilita el control de zoom inicial para añadirlo más tarde
        }).setView([18.9, -70.7], 8);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        // Escuchar el evento de cierre de popup en el mapa para ocultar el panel lateral
        map.on('popupclose', function() {
            infoPanel.classList.remove('open');
        });
    }
    map.invalidateSize(); // Invalida el tamaño cada vez que la pantalla del mapa se hace visible
}

// Función para añadir los marcadores al mapa una vez que este ha sido inicializado
function addMarkersToMap() {
    if (map && mapMarkers.length > 0) {
        // Limpiar marcadores existentes si los hay para evitar duplicados en re-render
        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        
        mapMarkers.forEach(marker => marker.addTo(map));
        // Opcional: Centrar y hacer zoom al grupo de marcadores
        const group = new L.featureGroup(mapMarkers);
        map.fitBounds(group.getBounds().pad(0.5)); // Añade un padding
    }
}


// --- Lógica de visibilidad de las pantallas con animaciones ---
document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que la pantalla inicial sea visible por defecto
    initialScreen.classList.add('visible');
    mapScreen.classList.remove('visible'); // Asegurarse de que el mapa no sea visible al inicio

    if (exploreMapBtn) {
        exploreMapBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            // Inicia la animación de salida para initialScreen
            initialScreen.classList.remove('visible');
            initialScreen.classList.add('hidden'); // Esto dispara la animación CSS

            // Después de que la animación de salida (0.7s) termine, muestra mapScreen
            setTimeout(() => {
                mapScreen.classList.remove('hidden'); // Quita hidden para que la animación de entrada se ejecute
                mapScreen.classList.add('visible'); // Esto dispara la animación CSS

                initializeMap(); 
                addMarkersToMap(); 
            }, 700); // Coincide con la duración de la transición CSS
        });
    } else {
        console.error("Error: El botón 'explore-map-btn' no fue encontrado en el DOM.");
    }

    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            // Inicia la animación de salida para mapScreen
            mapScreen.classList.remove('visible');
            mapScreen.classList.add('hidden'); // Esto dispara la animación CSS

            // Opcional: cerrar infoPanel si está abierto al volver a la pantalla inicial
            infoPanel.classList.remove('open');

            // Después de que la animación de salida (0.7s) termine, muestra initialScreen
            setTimeout(() => {
                initialScreen.classList.remove('hidden'); // Quita hidden para que la animación de entrada se ejecute
                initialScreen.classList.add('visible'); // Esto dispara la animación CSS
            }, 700); // Coincide con la duración de la transición CSS
        });
    } else {
        console.error("Error: El botón 'back-to-home-btn' no fue encontrado en el DOM.");
    }

    // Manejador para cerrar el panel de información (desde el botón 'x' del panel derecho)
    if (closeInfoPanelBtn) {
        closeInfoPanelBtn.addEventListener('click', () => {
            infoPanel.classList.remove('open');
            if (map) map.closePopup(); 
        });
    } else {
        console.error("Error: El botón 'close-info-panel' no fue encontrado en el DOM.");
    }

    // --- Lógica de carga de datos de parques (se ejecuta una vez al cargar la página) ---
    fetch('parques.json')
        .then(response => {
            console.log('la respuesta es', response)
            if (!response.ok) {
                throw new Error('Error al cargar parques.json: ' + response.statusText + ' (' + response.status + ')');
            }
            return response.json();
        })
        .then(parques => {
            allParquesData = parques; 

            if (!Array.isArray(allParquesData) || !allParquesData.every(p => typeof p === 'object')) {
                throw new Error('El archivo parques.json no contiene un array de objetos válido.');
            }

            const countByEstado = allParquesData.reduce((acc, parque) => {
                const estado = parque.estado || "Otro"; 
                acc[estado] = (acc[estado] || 0) + 1;
                return acc;
            }, {});

            allParquesData.forEach(parque => {
                const estadoActual = parque.estado || "Otro"; 
                let estadoInfo = estadosParques[estadoActual];

                if (!estadoInfo) {
                    console.warn(`Estado desconocido para el parque "${parque.nombre}": "${parque.estado}". Usando estilo "Otro".`);
                    estadoInfo = estadosParques["Otro"];
                }

                const markerColor = estadoInfo.color;
                const markerIconEmoji = estadoInfo.icon;

                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: ${markerColor};
                                width: 30px; height: 30px; border-radius: 50%;
                                display: flex; align-items: center; justify-content: center;
                                color: white; font-size: 1.2em; border: 2px solid white;
                                box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${markerIconEmoji}</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                const lat = parseFloat(parque.latitud);
                const lng = parseFloat(parque.longitud);

                if (isNaN(lat) || isNaN(lng)) {
                    console.warn(`Coordenadas inválidas para el parque "${parque.nombre}": Lat: ${parque.latitud}, Lng: ${parque.longitud}. Este parque será omitido.`);
                    return; 
                }

                const marker = L.marker([lat, lng], { icon: customIcon });

                marker.bindTooltip(parque.nombre, {
                    permanent: false,
                    direction: 'top',
                    offset: L.point(0, -20)
                });

                // Contenido del POPUP del marcador en el mapa
                let popupContent = `<h3>${parque.nombre}</h3>`;
                
                if (parque.imagen_url && parque.imagen_url !== "N/A" && parque.imagen_url.trim() !== "") {
                    popupContent += `<img src="${parque.imagen_url}" alt="Foto de ${parque.nombre}" style="max-width: 100%; height: auto; border-radius: 5px; margin-bottom: 10px;">`;
                }

                popupContent += `<p><strong>Estado:</strong> ${parque.estado || 'N/A'}</p>`;
                popupContent += `<p><strong>Capacidad:</strong> ${parque.capacidad_mwp || 'N/A'} MWp</p>`; 
                
                if (parque.drive_url && parque.drive_url !== "N/A" && parque.drive_url.trim() !== "") {
                    popupContent += `<p><a href="${parque.drive_url}" target="_blank" class="drive-link-button">Ver Documentos en Drive</a></p>`;
                }
                if (parque.Maps_url && parque.Maps_url !== "N/A" && parque.Maps_url.trim() !== "") {
                    popupContent += `<p><a href="${parque.Maps_url}" target="_blank" class="google-maps-link-button">Ver en Google Maps</a></p>`;
                }

                marker.bindPopup(popupContent);

                marker.on('click', function() {
                    displayParkInfo(parque);
                });
                
                mapMarkers.push(marker); 
            });

            // Generar la leyenda
            const legendDiv = document.getElementById('legend');
            if (legendDiv) { 
                legendDiv.innerHTML = '';

                for (const estadoKey in estadosParques) {
                    const estadoData = estadosParques[estadoKey];
                    const itemCount = countByEstado[estadoKey] || 0;
                    const item = document.createElement('div');
                    item.className = `legend-item ${estadoData.cssClass}`;
                    item.setAttribute('title', estadoData.description);

                    item.innerHTML = `
                        <div class="legend-color-box" style="background-color: ${estadoData.color};"></div>
                        <span class="legend-icon">${estadoData.icon}</span>
                        <span class="legend-text">${estadoKey}</span>
                        <span class="legend-count">(${itemCount})</span>
                    `;
                    legendDiv.appendChild(item);
                }
            } else {
                console.error("Error: El elemento 'legend' no fue encontrado en el DOM.");
            }

            // --- Lógica para la nueva sección inferior (en la primera ventana) ---
            // 1. Llenar el listado de parques
            if (parkNamesList) {
                parkNamesList.innerHTML = ''; 
                allParquesData.filter(p => 
                    p.nombre !== 'Guayubin' && 
                    !isNaN(parseFloat(p.capacidad_mwp)) && 
                    p.capacidad_mwp !== null && p.capacidad_mwp !== undefined && p.capacidad_mwp.trim() !== ''
                ).forEach(parque => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${parque.nombre} (${parque.capacidad_mwp} MWp)`; 
                    parkNamesList.appendChild(listItem);
                });
            } else {
                console.error("Error: El elemento 'park-names-list' no fue encontrado en el DOM.");
            }

            // 2. Inicializar o actualizar el gráfico de pastel
            if (capacityPieChartCanvas) {
                updatePieChart(allParquesData);
            } else {
                console.error("Error: El canvas 'capacity-pie-chart' no fue encontrado en el DOM.");
            }

        })
        .catch(error => {
            console.error('Error al cargar o parsear los datos de los parques:', error);
            const errorMessageHTML = '<div style="text-align: center; padding: 20px; color: red; background-color: #ffe0e0; border: 1px solid #ffaaaa; border-radius: 8px; margin: 20px;"><h3>Error al cargar los datos.</h3><p>Por favor, asegúrate de que el archivo <code>parques.json</code> exista y esté bien formado. Revisa la consola (F12) para detalles.</p></div>';

            if (initialScreen) {
                const headerContent = initialScreen.querySelector('.header-content');
                if (headerContent) {
                    headerContent.style.display = 'none'; 
                    if (exploreMapBtn) exploreMapBtn.style.display = 'none'; 
                    initialScreen.insertAdjacentHTML('afterbegin', errorMessageHTML); 
                }
            }

            if (mapScreen) {
                mapScreen.innerHTML = '<div style="text-align: center; padding: 20px; color: red; background-color: #ffe0e0; border: 1px solid #ffaaaa; border-radius: 8px; margin: 20px;"><h3>Mapa no disponible.</h3><p>Los datos no pudieron cargarse. Revisa la consola para más información.</p></div>';
            }
            alert('¡Ups! No se pudieron cargar los datos de los parques. Por favor, revisa el archivo parques.json y la consola del navegador para más detalles.');
        });
});


// Función para inicializar o actualizar el gráfico de pastel
function updatePieChart(parquesData) {
    const parquesFiltrados = parquesData.filter(p => 
        p.nombre !== "Guayubin" && 
        !isNaN(parseFloat(p.capacidad_mwp)) 
    );

    const totalCapacidadMWp = parquesFiltrados.reduce((sum, parque) => {
        return sum + parseFloat(parque.capacidad_mwp);
    }, 0);

    const capacidadOperacionMWp = parquesFiltrados.reduce((sum, parque) => {
        return parque.estado === "En Operación" ? sum + parseFloat(parque.capacidad_mwp) : sum;
    }, 0);

    if (totalCapacitySpan) {
        totalCapacitySpan.textContent = totalCapacidadMWp.toFixed(2); 
    }

    const capacidadRestanteMWp = totalCapacidadMWp - capacidadOperacionMWp;

    const data = {
        labels: ['En Operación', 'Pendiente'],
        datasets: [{
            data: [capacidadOperacionMWp, capacidadRestanteMWp],
            backgroundColor: [
                '#28a745', 
                '#007bff' 
            ],
            hoverOffset: 4
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        if (label) {
                            let value = context.parsed;
                            return `${label}: ${value.toFixed(2)} MWp`;
                        }
                        return '';
                    }
                }
            },
            legend: {
                position: 'bottom',
                labels: {
                    color: 'black' 
                }
            },
            title: {
                display: true,
                text: 'Cumplimiento de Capacidad (MWp)',
                color: 'black',
                font: {
                    size: 16
                }
            }
        }
    };

    if (myPieChart) {
        myPieChart.data = data;
        myPieChart.update();
    } else {
        if (capacityPieChartCanvas) {
            myPieChart = new Chart(capacityPieChartCanvas, {
                type: 'pie',
                data: data,
                options: options
            });
        }
    }
}


// Función para mostrar la información detallada del parque en el panel lateral
function displayParkInfo(parque) {
    if (!infoContent || !infoPanel) {
        console.error("Error: Elementos del infoPanel no encontrados en el DOM.");
        return;
    }

    let contentHTML = `
        <h2>${parque.nombre || 'N/A'}</h2>
    `;

    if (parque.imagen_url && parque.imagen_url !== "N/A" && parque.imagen_url.trim() !== "") {
        contentHTML += `<img src="${parque.imagen_url}" alt="Foto de ${parque.nombre}" class="park-info-image" loading="lazy">`;
    }

    contentHTML += `
        <p><strong>Estado:</strong> ${parque.estado || 'N/A'}</p>
        <p><strong>Capacidad:</strong> ${parque.capacidad_mwp || 'N/A'} MWp</p>
        <p><strong>Fecha de Operación:</strong> ${parque.fecha_operacion || 'N/A'}</p>
        <p><strong>Empresa Desarrolladora:</strong> ${parque.empresa_desarrolladora || 'N/A'}</p>
        <p><strong>Capacidad Línea Transmisión:</strong> ${parque.linea_transmision_capacidad || 'N/A'}</p>
        <p><strong>Coordenadas:</strong> ${parque.latitud || 'N/A'}, ${parque.longitud || 'N/A'}</p>
        <p><strong>Provincia:</strong> ${parque.provincia || 'N/A'}</p>
        <p><strong>Municipio:</strong> ${parque.municipio || 'N/A'}</p>
        ${parque.descripcion ? `<p><strong>Descripción:</strong> ${parque.descripcion}</p>` : ''}
    `;

    contentHTML += `
        <div class="park-links-section">
            <h3>Enlaces Útiles</h3>
            ${parque.drive_url && parque.drive_url !== "N/A" && parque.drive_url.trim() !== "" ?
                `<p><a href="${parque.drive_url}" target="_blank" class="drive-link-button">Documentos del Proyecto (Drive)</a></p>` : ''
            }
            ${parque.Maps_url && parque.Maps_url !== "N/A" && parque.Maps_url.trim() !== "" ?
                `<p>
                    <a href="${parque.Maps_url}" target="_blank" class="google-maps-link-button">
                        Ver Ubicación en Google Maps
                    </a>
                </p>` : ''
            }
        </div>
    `;

    infoContent.innerHTML = contentHTML;
    infoPanel.classList.add('open');
}