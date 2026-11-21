import { MetadataRoute } from 'next'
import { SITE_URL } from '../lib/site'

/* Abierto para todos, y explícito para los bots de búsqueda y de IA (GEO, fase C 2026-11-20): que un bloqueo genérico
   futuro no los deje afuera sin querer. Rastreo de entrenamiento y de respuesta permitidos por decisión del
   reposicionamiento (el objetivo es que las IAs citen el sitio). */
const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Bingbot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
  'meta-externalagent',
  'CCBot',
  'DuckAssistBot',
  'MistralAI-User',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SEARCH_BOTS, allow: '/' },
      { userAgent: '*', allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
