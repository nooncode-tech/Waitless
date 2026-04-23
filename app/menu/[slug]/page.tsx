import { MenuDigitalPage } from '@/components/menu-digital/menu-digital-page'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function MenuDigital({ params }: Props) {
  const { slug } = await params
  return <MenuDigitalPage slug={slug} />
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  return {
    title: `Menú — ${slug}`,
    description: 'Ordena en línea desde nuestro menú digital',
  }
}
