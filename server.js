/**
 * Servidor Node.js para OpenAI Realtime API
 * Maneja la generación de tokens efímeros y conexión WebSocket
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servir archivos estáticos

/**
 * Endpoint para generar token efímero de sesión
 * Este token es temporal y seguro para usar en el cliente
 */
app.get('/api/session', async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'OPENAI_API_KEY no configurada en el servidor' 
            });
        }

        console.log('🔄 Solicitando token efímero a OpenAI...');

        // Configuración mínima para el endpoint de client_secrets (versión GA)
        // Los parámetros como voice y turn_detection se configuran después
        const requestBody = {
            expires_after: {
                anchor: 'created_at',
                seconds: 600  // Token válido por 10 minutos
            },
            session: {
                type: 'realtime',
                model: 'gpt-realtime-mini',
                instructions: 'Eres un asistente de voz útil y amigable. Responde de manera concisa y natural en español.'
            }
        };

        console.log('📤 Enviando configuración:', JSON.stringify(requestBody, null, 2));

        // Llamada a la API de OpenAI para obtener token efímero (versión GA)
        const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 Respuesta de OpenAI - Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error de OpenAI:', errorText);
            return res.status(response.status).json({ 
                error: 'Error al crear sesión con OpenAI',
                status: response.status,
                details: errorText 
            });
        }

        const sessionData = await response.json();
        console.log('✅ Sesión creada exitosamente');
        console.log('📋 Datos recibidos:', JSON.stringify(sessionData, null, 2));
        
        // Retornar la información necesaria para el cliente
        res.json({
            client_secret: sessionData,  // Incluye el objeto completo con value
            model: sessionData.session?.model || 'gpt-realtime-mini',
            expires_at: sessionData.expires_at
        });

    } catch (error) {
        console.error('❌ Error en /api/session:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            message: error.message 
        });
    }
});

/**
 * Endpoint alternativo: Proxy WebSocket (opcional)
 * Útil si quieres mayor control sobre la conexión
 */
app.get('/api/proxy-session', async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'API Key no configurada' });
        }

        // En este caso, podrías implementar un proxy completo
        // que maneje toda la comunicación WebSocket del lado del servidor
        // Esto es más seguro pero requiere más recursos del servidor
        
        res.json({
            message: 'Implementación de proxy disponible',
            recommendation: 'Usar el endpoint /api/session para cliente directo'
        });

    } catch (error) {
        console.error('Error en /api/proxy-session:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        openai_configured: !!process.env.OPENAI_API_KEY
    });
});

/**
 * Información de la API
 */
app.get('/api/info', (req, res) => {
    res.json({
        version: '1.0.0',
        model: 'gpt-realtime-mini',
        endpoints: {
            session: '/api/session',
            health: '/health',
            info: '/api/info'
        },
        pricing: {
            input: '$100 per 1M tokens (~$0.06 per minute)',
            output: '$200 per 1M tokens (~$0.24 per minute)'
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  Servidor OpenAI Realtime API                              ║
╠════════════════════════════════════════════════════════════╣
║  Puerto: ${PORT}                                              ║
║  Modelo: gpt-realtime-mini                                 ║
║  API Key configurada: ${!!process.env.OPENAI_API_KEY ? 'Sí ✓' : 'No ✗'}                        ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints disponibles:                                    ║
║  • GET  /api/session      - Obtener token efímero         ║
║  • GET  /health           - Estado del servidor           ║
║  • GET  /api/info         - Información de la API         ║
║  • GET  /                 - Cliente web (public/index.html)║
╚════════════════════════════════════════════════════════════╝
    `);
    
    if (!process.env.OPENAI_API_KEY) {
        console.warn(`
⚠️  ADVERTENCIA: OPENAI_API_KEY no está configurada
   Crea un archivo .env con tu API key:
   OPENAI_API_KEY=tu-api-key-aqui
        `);
    }
});

// Manejo de errores global
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
});