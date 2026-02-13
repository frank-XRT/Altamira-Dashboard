const { Lote, EstadoLote } = require("../models");
const xlsx = require("xlsx");

exports.uploadLotsExcel = async (req, res) => {
  try {
    const id_proyecto = parseInt(req.body.id_proyecto);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!id_proyecto || isNaN(id_proyecto))
      return res.status(400).json({ message: "Valid Project ID is required" });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // raw: true to get values as they are, but headers might be tricky. 
    // defval: null ensures missing columns are null instead of undefined.
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (data.length > 0) {
      console.log('Export Mapping Keys:', Object.keys(data[0]));
    }

    // Fetch all possible states for mapping
    const allStates = await EstadoLote.findAll();
    const stateMap = {};
    allStates.forEach((s) => {
      stateMap[s.nombre_estado.toUpperCase()] = s.id_estado_lote;
    });

    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let errors = [];
    const processedLotsInReq = new Set();

    for (const row of data) {
      // Helper to get value loosely (case insensitive keys)
      const getValue = (keyPattern) => {
        const key = Object.keys(row).find((k) =>
          k.match(new RegExp(keyPattern, "i")),
        );
        return key ? row[key] : undefined;
      };

      const mz = getValue("Manzana|MZ")?.toString().trim().toUpperCase();
      let numRaw = getValue("numero|Numero|Lote|N°"); 
      const areaRaw = getValue("area|Area|M2");
      const contadoRaw = getValue("precio|Contado|Precio");
      const financiadoRaw = getValue("financiado|Financiado");
      const ofertaRaw = getValue("oferta|Oferta");
      const ubicacionRaw = getValue("ubicacion|Ubicacion|Ubic");
      const estadoRaw = getValue("estado|Estado");
      const coordXRaw = getValue("CoordX|X|CoordenadaX");
      const coordYRaw = getValue("CoordY|Y|CoordenadaY");

      if (!mz || numRaw === null || numRaw === undefined) {
        continue;
      }

      // Clean Number
      let num = numRaw;
      if (typeof num === "string") {
        const match = num.match(/\d+/);
        if (match) num = parseInt(match[0]);
      }

      const cleanNumber = (val) => {
        if (typeof val === "number") return val;
        if (val === null || val === undefined || val === "") return null;
        
        let s = val.toString().trim();
        // Detectar si el punto o la coma es el separador decimal
        if (s.includes(',') && s.includes('.')) {
          const dotIdx = s.lastIndexOf('.');
          const commaIdx = s.lastIndexOf(',');
          if (commaIdx > dotIdx) {
            // Caso 1.000,50 -> Coma es decimal
            s = s.replace(/\./g, "").replace(/,/g, ".");
          } else {
            // Caso 16,000.00 -> Punto es decimal
            s = s.replace(/,/g, "");
          }
        } else if (s.includes(',')) {
          // Si solo hay coma, verificar si parece decimal (ej: 653,61) o miles (ej: 16,000)
          const parts = s.split(',');
          const lastPart = parts[parts.length - 1];
          if (lastPart.length === 3 && parts.length === 2 && parseInt(s) >= 1) {
            // Tres dígitos después de la coma: probable miles -> 16000
            s = s.replace(/,/g, "");
          } else {
            // 1 o 2 dígitos, o múltiples comas: probable decimal -> 653.61
            s = s.replace(/,/g, ".");
          }
        }

        s = s.replace(/[^\d.-]/g, "");
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
      };

      const area = cleanNumber(areaRaw);
      const precioContado = cleanNumber(contadoRaw);
      const precioFinanciado = cleanNumber(financiadoRaw);
      const precioOferta = cleanNumber(ofertaRaw);
      const coordX = cleanNumber(coordXRaw);
      const coordY = cleanNumber(coordYRaw);
      const ubicacion = ubicacionRaw
        ? ubicacionRaw.toString().trim().toLowerCase()
        : null;
      const targetStateId = estadoRaw
        ? stateMap[estadoRaw.toString().trim().toUpperCase()]
        : null;

      // Evitar procesar duplicados en el mismo archivo
      const lotKey = `${mz}-${num}`;
      
      if (processedLotsInReq.has(lotKey)) {
        errors.push(`Fila duplicada omitida en Excel: MZ ${mz} Lote ${num}`);
        continue;
      }
      processedLotsInReq.add(lotKey);

      if (mz === 'C' && num == 19) {
        console.log(`DEBUG C-19: Excel Row (Cleaned) -> Area: ${area}, Precio: ${precioContado}`);
      }

      // Find Lote
      const lote = await Lote.findOne({
        where: {
          manzana: mz,
          numero: num,
          id_proyecto: id_proyecto,
        },
      });

      if (lote) {
        if (mz === 'C' && num == 19) {
          console.log(`DEBUG C-19: DB Found -> Area: ${lote.area}, Precio: ${lote.precio_contado}`);
        }
        let needsUpdate = false;
        const changes = {};

        // Float comparison tolerance
        const diff = (a, b) => {
          if (a === null || b === null) return a !== b;
          return Math.abs(parseFloat(a) - parseFloat(b)) > 0.001;
        };

        if (area !== null && diff(lote.area, area)) {
          changes.area = area;
          needsUpdate = true;
        }

        if (
          precioContado !== null &&
          diff(lote.precio_contado, precioContado)
        ) {
          changes.precio_contado = precioContado;
          needsUpdate = true;
        }

        if (
          precioFinanciado !== null &&
          diff(lote.precio_financiado, precioFinanciado)
        ) {
          changes.precio_financiado = precioFinanciado;
          needsUpdate = true;
        }

        if (precioOferta !== null && diff(lote.precio_oferta, precioOferta)) {
          changes.precio_oferta = precioOferta;
          needsUpdate = true;
        }

        if (targetStateId && parseInt(lote.id_estado_lote) !== parseInt(targetStateId)) {
          console.log(`Update id_estado_lote for Mz ${mz} Lote ${num}: ${lote.id_estado_lote} -> ${targetStateId}`);
          changes.id_estado_lote = targetStateId;
          needsUpdate = true;
        }

        if (ubicacion && (lote.ubicacion || '').toLowerCase() !== ubicacion.toLowerCase()) {
          console.log(`Update ubicacion for Mz ${mz} Lote ${num}: ${lote.ubicacion} -> ${ubicacion}`);
          changes.ubicacion = ubicacion;
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log(`Persisting changes for lot Mz ${mz} Lote ${num}:`, changes);
          await lote.update(changes);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Create new Lote if it doesn't exist
        try {
            // Manzana Anchors mapping to position dots near their block zones
            const manzanaAnchors = {
              A: { x: 25, y: 30 },
              B: { x: 75, y: 70 },
              C: { x: 25, y: 70 },
              D: { x: 25, y: 30 },
              E: { x: 75, y: 30 },
              F: { x: 50, y: 50 },
            };

            const anchor = manzanaAnchors[mz.toString().toUpperCase()] || {
              x: 50,
              y: 50,
            };

            // Disperse within a 15% radius around the anchor
            const finalX =
              coordX !== null ? coordX : anchor.x + (Math.random() * 15 - 7.5);
            const finalY =
              coordY !== null ? coordY : anchor.y + (Math.random() * 15 - 7.5);

            await Lote.create({
              manzana: mz.toString(),
              numero: num,
              area: area,
              precio_contado: precioContado,
              precio_financiado: precioFinanciado,
              precio_oferta: precioOferta,
              ubicacion: ubicacion || "calle",
              id_proyecto: id_proyecto,
              id_estado_lote: targetStateId || stateMap["DISPONIBLE"] || 1,
              coordenada_x: Math.max(0, Math.min(100, finalX)),
              coordenada_y: Math.max(0, Math.min(100, finalY)),
            });
          createdCount++;
        } catch (createError) {
          errors.push(
            `Error creando Lote Mz ${mz} Lote ${num}: ${createError.message}`,
          );
        }
      }
    }

    res.json({
      message: "Proceso de carga completado",
      updated: updatedCount,
      created: createdCount,
      skipped: skippedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 50), // Return first 50 errors
    });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Error procesando Excel", error: e.message });
  }
};

exports.createLot = async (req, res) => {
  try {
    const { id_estado_lote } = req.body;

    // Check if creating as ESPACIO PUBLICO
    if (id_estado_lote) {
      const publicState = await EstadoLote.findOne({
        where: { nombre_estado: "ESPACIO PUBLICO" },
      });
      if (
        publicState &&
        parseInt(id_estado_lote) === publicState.id_estado_lote
      ) {
        req.body.precio_contado = null;
        req.body.precio_financiado = null;
        req.body.precio_oferta = null;
      }
    }

    const lot = await Lote.create(req.body);
    res.status(201).json(lot);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating lot", error: error.message });
  }
};

exports.updateLot = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    const currentLot = await Lote.findByPk(id);
    if (!currentLot) return res.status(404).json({ message: "Lot not found" });

    const publicState = await EstadoLote.findOne({
      where: { nombre_estado: "ESPACIO PUBLICO" },
    });

    if (publicState) {
      const targetStateId =
        updateData.id_estado_lote !== undefined
          ? updateData.id_estado_lote
          : currentLot.id_estado_lote;

      if (parseInt(targetStateId) === publicState.id_estado_lote) {
        // Force prices to null if state is ESPACIO PUBLICO
        updateData.precio_contado = null;
        updateData.precio_financiado = null;
        updateData.precio_oferta = null;
      }
    }

    await Lote.update(updateData, { where: { id_lote: id } });
    res.json({ message: "Lot updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating lot", error: error.message });
  }
};

exports.deleteLot = async (req, res) => {
  try {
    const { id } = req.params;
    await Lote.destroy({ where: { id_lote: id } });
    res.json({ message: "Lot deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting lot", error: error.message });
  }
};

exports.getLotById = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await Lote.findByPk(id, { include: [EstadoLote] });
    if (!lot) return res.status(404).json({ message: "Lot not found" });
    res.json(lot);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving lot", error: error.message });
  }
};

exports.getLotStates = async (req, res) => {
  try {
    const states = await EstadoLote.findAll();
    res.json(states);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving states", error: error.message });
  }
};

exports.getLots = async (req, res) => {
  try {
    const lots = await Lote.findAll({
      include: [EstadoLote],
    });

    const features = lots
      .map((lot) => {
        let geometry = null;
        try {
          if (lot.geojson) {
            geometry = JSON.parse(lot.geojson);
          }
        } catch (e) {
          console.error("Error parsing geojson for lot " + lot.id_lote, e);
        }

        if (!geometry) return null;

        // Lógica para zonas públicas (override)
        const publicZones = [
          { m: "B", n: 1, label: "Parque" },
          { m: "B", n: 2, label: "Club House" },
          { m: "C", n: 4, label: "Juegos infantiles" },
          { m: "C", n: 5, label: "Deportes" },
          { m: "A", n: 23, label: "Educacion" },
          { m: "A", n: 29, label: "Otros fines" },
        ];

        const isPublic = publicZones.find(
          (z) => z.m === lot.manzana && z.n === lot.numero,
        );

        const isSold =
          lot.EstadoLote && lot.EstadoLote.nombre_estado === "VENDIDO";
        const isPublicSpace =
          lot.EstadoLote && lot.EstadoLote.nombre_estado === "ESPACIO PUBLICO";

        const precioFormatted =
          isPublic || isSold || isPublicSpace
            ? ""
            : new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: "PEN",
              }).format(lot.precio_contado);

        const areaFormatted = `${Math.round(lot.area * 100) / 100} m²`;
        const estadoFinal = isPublic
          ? "ZONA PUBLICA"
          : lot.EstadoLote
            ? lot.EstadoLote.nombre_estado
            : "DISPONIBLE";
        const nota = isPublic ? isPublic.label : "";

        return {
          type: "Feature",
          properties: {
            lote: lot.numero,
            manzana: lot.manzana,
            area: areaFormatted,
            precio: precioFormatted,
            estado: estadoFinal,
            nota: nota,
            _dbId: lot.id_lote,
            id_proyecto: lot.id_proyecto,
          },
          geometry: geometry,
        };
      })
      .filter((f) => f !== null);

    res.json({
      type: "FeatureCollection",
      features: features,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving lots", error: error.message });
  }
};
