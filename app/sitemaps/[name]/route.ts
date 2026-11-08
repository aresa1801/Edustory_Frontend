import { shardByName, urlset } from '@/lib/sitemap-data'

export const revalidate = 3600
export const dynamicParams = true

export async function GET(_request: Request, context: { params: { name: string } }) {
  const name = context.params.name.replace(/\.xml$/, '')
  const shard = shardByName(name)
  if (!shard) return new Response('Not found', { status: 404 })

  return new Response(urlset(shard.entries), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
