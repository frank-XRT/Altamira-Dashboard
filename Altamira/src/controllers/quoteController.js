const { Cotizacion, Lote, Cliente, Usuario, Proyecto } = require('../models');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// --- ASSETS PRELOADING ---
// Optimization: Preload logo into memory to avoid FS calls on every PDF generation
// PDFKit supports: JPEG, PNG. It DOES NOT support WebP.
const logoPath = path.join(__dirname, '../../public/img/LOGO_ALTAMIRA.png'); 
let logoBufferAltamira = null;

try {
    if (fs.existsSync(logoPath)) {
        logoBufferAltamira = fs.readFileSync(logoPath);
        console.log('PDF Generation: Logo preloaded successfully (PNG/JPG).');
    } else {
        console.warn('PDF Generation: Logo file not found at', logoPath);
        console.warn('Please ensure a PNG or JPG version of the logo exists.');
    }
} catch (error) {
    console.error('PDF Generation: Error preloading logo:', error);
}

exports.createQuote = async (req, res) => {
    try {
        const { precio_base, descuento, inicial, plazo_meses, id_cliente, id_lote } = req.body;
        const id_usuario = req.user.id;

        // Calculate functionality
        // Business Logic:
        // Final Price = Base Price - Discount
        // Financed Amount = Final Price - Initial
        // Monthly Payment = Financed Amount / Months

        const precio_final = precio_base - descuento;
        const monto_financiar = precio_final - inicial;
        const mensualidad = plazo_meses > 0 ? (monto_financiar / plazo_meses) : 0;

        const newQuote = await Cotizacion.create({
            precio_base,
            descuento,
            precio_final,
            inicial,
            mensualidad,
            plazo_meses,
            id_cliente,
            id_usuario,
            id_lote
        });

        res.status(201).json(newQuote);
    } catch (error) {
        res.status(500).json({ message: 'Error creating quote', error: error.message });
    }
};

exports.getAllQuotes = async (req, res) => {
    try {
        const { role, id } = req.user;

        let whereClause = {};

        // If not admin, restrict to own quotes
        if (role !== 'Administrador') {
            whereClause = { id_usuario: id };
        }

        const quotes = await Cotizacion.findAll({
            where: whereClause,
            include: [
                {
                    model: Lote,
                    include: [Proyecto]
                },
                { model: Cliente },
                { model: Usuario }
            ],
            order: [['id_cotizaciones', 'DESC']]
        });
        res.json(quotes);
    } catch (error) {
        console.error('SERVER ERROR in getAllQuotes:', error);
        res.status(500).json({ message: 'Error fetching quotes', error: error.message });
    }
};

exports.getQuotePdf = async (req, res) => {
    try {
        const { id } = req.params;
        const quote = await Cotizacion.findByPk(id, {
            include: [
                { model: Lote, include: [Proyecto] },
                { model: Cliente },
                { model: Usuario }
            ]
        });

        if (!quote) return res.status(404).json({ message: 'Quote not found' });

        if (!quote.Lote || !quote.Lote.Proyecto || !quote.Cliente || !quote.Usuario) {
            return res.status(400).json({ message: 'Quote data incomplete. Missing associated records.' });
        }

        // Initialize PDF
        const doc = new PDFDocument({
            size: 'A4',
            autoFirstPage: true,
            margins: {
                top: 30,
                left: 30,
                right: 30,
                bottom: 0 
            },
            bufferPages: true // Enable buffer pages for potentially better performance
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=cotizacion-${id}.pdf`);

        doc.pipe(res);

        // --- THEME CONFIGURATION ---
        const COLORS = {
            primary: '#E41022',
            secondary: '#383637',
            text: '#333333',
            textLight: '#555555',
            background: '#F8F9FA',
            white: '#FFFFFF',
            border: '#E0E0E0'
        };

        const FONTS = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };

        // --- ASSETS ---
        // Optimization: Use cached buffer if available
        // Note: logoBuffer logic should be defined at module level (see below)
        
        // --- HELPER FUNCTIONS ---
        const drawSectionHeader = (text, y) => {
            doc.rect(30, y, 535, 24).fill(COLORS.background); // Full width background
            doc.fillColor(COLORS.primary).font(FONTS.bold).fontSize(10)
                .text(text.toUpperCase(), 40, y + 7, { characterSpacing: 1 });
        };

        const drawField = (label, value, x, y, width) => {
            doc.font(FONTS.bold).fontSize(9).fillColor(COLORS.secondary).text(label, x, y);
            doc.font(FONTS.regular).fontSize(9).fillColor(COLORS.text).text(value, x, y + 14, { width: width, align: 'left' });
        };

        const formatCurrency = (amount) => `S/ ${parseFloat(amount).toFixed(2)}`;

        // ==========================================
        // HEADER SECTION
        // ==========================================

        // Top Red Bar
        doc.rect(0, 0, 595, 8).fill(COLORS.primary);

        // Logo - Use Preloaded Buffer (PNG/JPG only)
        if (logoBufferAltamira) {
             try {
                // Buffer is already loaded
                doc.image(logoBufferAltamira, 50, 10, { fit: [130, 100], align: 'left' });
             } catch(err) {
                 console.error("PDF Generation: Error drawing logo from buffer", err);
                 // Fallback text
                 doc.fillColor(COLORS.primary).fontSize(20).font(FONTS.bold).text('Los Altos Del Sol', 30, 40);
             }
        } else if (fs.existsSync(logoPath)) {
            // Fallback: If buffer failed but file exists (unlikely given startup check)
            try {
                doc.image(logoPath, 30, 30, { fit: [120, 80], align: 'left' });
            } catch (err) {
                 console.error("PDF Generation: Error loading logo from disk", err);
                 doc.fillColor(COLORS.primary).fontSize(20).font(FONTS.bold).text('Los Altos Del Sol', 30, 40);
            }
        } else {
            // No logo found
            doc.fillColor(COLORS.primary).fontSize(20).font(FONTS.bold).text('Los Altos Del Sol', 30, 40);
        }
        // Company Details (Right Aligned)
        const companyInfoY = 35;
        doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.secondary)
            .text('Grupo famia inmobiliaria s.a.c', 200, companyInfoY, { align: 'right' });

        doc.font(FONTS.regular).fontSize(9).fillColor(COLORS.textLight)
            .text('RUC: 20614933551', 200, companyInfoY + 14, { align: 'right' })
            .text('Calle Los Jazmines, San Isidro, Mz. F - Lte. 14, Ica', 200, companyInfoY + 26, { align: 'right' })
            .text('https://grupofamia.com/', 200, companyInfoY + 38, { align: 'right' });

        // ==========================================
        // TITLE & ID
        // ==========================================
        // Moved down to 160 to absolutely guarantee no overlap with large logos
        let currentY = 115;

        doc.moveTo(30, currentY + 30).lineTo(565, currentY + 30).strokeColor(COLORS.border).stroke();

        doc.font(FONTS.bold).fontSize(22).fillColor(COLORS.secondary)
            .text('COTIZACIÓN', 30, currentY);

        doc.font(FONTS.regular).fontSize(12).fillColor(COLORS.textLight)
            .text(`# ${String(quote.id_cotizaciones).padStart(6, '0')}`, 30, currentY + 5, { align: 'right' });

        doc.text(`Fecha: ${new Date(quote.fecha_creacion).toLocaleDateString('es-PE')}`, 30, currentY + 20, { align: 'right', fontSize: 9 });


        // ==========================================
        // INFO COLUMNS
        // ==========================================
        currentY += 50; // 210

        // Left Column: Client Data
        doc.font(FONTS.bold).fontSize(11).fillColor(COLORS.primary).text('DATOS DEL CLIENTE', 30, currentY);
        doc.rect(30, currentY + 15, 250, 2).fill(COLORS.primary);

        doc.font(FONTS.bold).fontSize(9).fillColor(COLORS.secondary);
        doc.text('Cliente:', 30, currentY + 30);
        doc.font(FONTS.regular).fillColor(COLORS.text).text(quote.Cliente.nombre, 100, currentY + 30);

        doc.font(FONTS.bold).fillColor(COLORS.secondary).text('Documento:', 30, currentY + 45);
        doc.font(FONTS.regular).fillColor(COLORS.text).text(quote.Cliente.documento, 100, currentY + 45);

        // Right Column: Advisor Data
        const col2X = 310;
        doc.font(FONTS.bold).fontSize(11).fillColor(COLORS.primary).text('ASESOR COMERCIAL', col2X, currentY);
        doc.rect(col2X, currentY + 15, 255, 2).fill(COLORS.primary);

        doc.font(FONTS.bold).fontSize(9).fillColor(COLORS.secondary);
        doc.text('Asesor:', col2X, currentY + 30);
        doc.font(FONTS.regular).fillColor(COLORS.text).text(quote.Usuario.nombre, col2X + 60, currentY + 30);

        doc.font(FONTS.bold).fillColor(COLORS.secondary).text('Número:', col2X, currentY + 45);
        doc.font(FONTS.regular).fillColor(COLORS.text).text(quote.Usuario.telefono || '', col2X + 60, currentY + 45);


        // ==========================================
        // PROPERTY DETAILS
        // ==========================================
        currentY += 80; // 290
        drawSectionHeader('DETALLE DEL INMUEBLE', currentY);

        const project = quote.Lote.Proyecto;
        currentY += 35;

        drawField('PROYECTO', project.nombre, 40, currentY, 140);
        drawField('UBICACIÓN', (quote.Lote.ubicacion || 'Calle').toUpperCase(), 170, currentY, 140);
        drawField('MANZANA', quote.Lote.manzana, 320, currentY, 60);
        drawField('LOTE', quote.Lote.numero, 390, currentY, 60);
        drawField('ÁREA', `${quote.Lote.area} m²`, 460, currentY, 60);

        doc.moveTo(30, currentY + 30).lineTo(565, currentY + 30).lineWidth(0.5).strokeColor(COLORS.border).stroke();


        // ==========================================
        // FINANCIAL SUMMARY
        // ==========================================
        currentY += 60; // 385
        drawSectionHeader('RESUMEN FINANCIERO', currentY);

        currentY += 35; // 420

        const drawFinRow = (label, value, y, isTotal = false) => {
            doc.font(isTotal ? FONTS.bold : FONTS.regular).fontSize(10).fillColor(COLORS.secondary)
                .text(label, 40, y);
            doc.font(isTotal ? FONTS.bold : FONTS.regular).fontSize(10).fillColor(COLORS.text)
                .text(value, 40, y, { align: 'right', width: 515 });
            doc.moveTo(40, y + 14).lineTo(555, y + 14).lineWidth(0.5).strokeColor('#F0F0F0').stroke();
        };

        const montoFinanciar = quote.precio_final - quote.inicial;

        // Compact rows (18px spacing instead of 20)
        drawFinRow('Precio de Venta', formatCurrency(quote.precio_base), currentY);
        currentY += 18;

        drawFinRow('Descuento', `- ${formatCurrency(quote.descuento)}`, currentY);
        currentY += 18;

        drawFinRow('Precio de Cierre', formatCurrency(quote.precio_final), currentY, true);
        currentY += 25; // Small Gap

        drawFinRow('Inicial', formatCurrency(quote.inicial), currentY);
        currentY += 18;

        drawFinRow('Monto a Financiar', formatCurrency(montoFinanciar), currentY);
        currentY += 18;

        drawFinRow('Cuotas (Plazo)', `${quote.plazo_meses} meses`, currentY);

        // Highlight Box for "Cuota Mensual"
        currentY += 35;

        if (quote.plazo_meses > 1) {
            doc.rect(140, currentY, 315, 40).fill(COLORS.background);
            doc.rect(140, currentY, 315, 40).strokeColor(COLORS.primary).lineWidth(1).stroke();

            doc.font(FONTS.bold).fontSize(14).fillColor(COLORS.primary)
                .text(`Cuota Mensual: ${formatCurrency(quote.mensualidad)}`, 140, currentY + 12, {
                    width: 315,
                    align: 'center'
                });
        } else {
            doc.rect(140, currentY, 315, 40).fill('#e6fff2');
            doc.rect(140, currentY, 315, 40).strokeColor('#27ae60').lineWidth(1).stroke();

            doc.font(FONTS.bold).fontSize(14).fillColor('#27ae60')
                .text(`PRECIO DE CIERRE: ${formatCurrency(quote.precio_final)}`, 140, currentY + 12, {
                    width: 315,
                    align: 'center'
                });
        }


        // ==========================================
        // FOOTER
        // ==========================================
        const height = doc.page.height;
        // Strict footer position
        doc.rect(0, height - 50, 595, 50).fill(COLORS.secondary);

        doc.fillColor(COLORS.white).fontSize(10).font(FONTS.bold)
            .text('¡Gracias por confiar en nosotros!', 0, height - 35, { align: 'center' });

        doc.fillColor('#bdc3c7').fontSize(8).font(FONTS.regular)
            .text('Nota: La validez de esta cotización es de 7 días calendario. Precios sujetos a cambio sin previo aviso.', 0, height - 20, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ message: 'Error generating PDF', error: error.message });
    }
};

exports.deleteQuote = async (req, res) => {
    try {
        const { id } = req.params;
        // Verify if user is admin - though middleware checks for valid token, usually role check is in middleware or here.
        // Assuming simple token check is enough for now or relying on frontend role check (insecure but consistent with current app state).
        // Ideally: check req.user.role === 'Administrador'

        if (req.user.role !== 'Administrador') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const quote = await Cotizacion.findByPk(id);
        if (!quote) return res.status(404).json({ message: 'Quote not found' });

        await quote.destroy();
        res.json({ message: 'Quote deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quote', error: error.message });
    }
};

exports.updateQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const { precio_base, descuento, inicial, plazo_meses } = req.body;

        if (req.user.role !== 'Administrador') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const quote = await Cotizacion.findByPk(id);
        if (!quote) return res.status(404).json({ message: 'Quote not found' });

        // Recalculate if values provided
        const newPrice = precio_base !== undefined ? parseFloat(precio_base) : parseFloat(quote.precio_base);
        const newDiscount = descuento !== undefined ? parseFloat(descuento) : parseFloat(quote.descuento);
        const newInitial = inicial !== undefined ? parseFloat(inicial) : parseFloat(quote.inicial);
        const newMonths = plazo_meses !== undefined ? parseInt(plazo_meses) : parseInt(quote.plazo_meses);

        const precio_final = newPrice - newDiscount;
        const monto_financiar = precio_final - newInitial;
        const mensualidad = newMonths > 0 ? (monto_financiar / newMonths) : 0;

        await quote.update({
            precio_base: newPrice,
            descuento: newDiscount,
            inicial: newInitial,
            plazo_meses: newMonths,
            precio_final,
            mensualidad
        });

        res.json({ message: 'Quote updated successfully', quote });
    } catch (error) {
        res.status(500).json({ message: 'Error updating quote', error: error.message });
    }
};