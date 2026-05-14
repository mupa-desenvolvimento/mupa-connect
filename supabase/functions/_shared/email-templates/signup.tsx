/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo(a) à {siteName} — confirme seu e-mail</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Heading style={brand}>{siteName}</Heading>
          <Text style={heroSubtitle}>Mídia digital inteligente</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>Boas-vindas! 🎉</Heading>
          <Text style={lead}>
            Que bom ter você na <strong>{siteName}</strong>. Estamos muito
            felizes em começar essa jornada com você.
          </Text>
          <Text style={text}>
            Para ativar sua conta vinculada ao e-mail{' '}
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            , basta confirmar clicando no botão abaixo:
          </Text>

          <Section style={buttonWrap}>
            <Button style={primaryButton} href={confirmationUrl}>
              Confirmar meu e-mail
            </Button>
          </Section>

          <Text style={smallText}>
            Caso o botão não funcione, copie e cole este link no seu navegador:
          </Text>
          <Text style={linkBox}>
            <Link href={confirmationUrl} style={linkInline}>
              {confirmationUrl}
            </Link>
          </Text>

          <Hr style={divider} />

          <Heading as="h2" style={h2}>
            O que você pode fazer agora
          </Heading>
          <Text style={text}>
            ✓ Criar e gerenciar suas playlists de mídia<br />
            ✓ Conectar e monitorar seus players em tempo real<br />
            ✓ Publicar conteúdos em segundos para qualquer tela
          </Text>

          <Section style={buttonWrap}>
            <Button style={secondaryButton} href={siteUrl}>
              Acessar a plataforma
            </Button>
          </Section>
        </Section>

        <Text style={footer}>
          Se você não criou esta conta, pode ignorar este e-mail com
          segurança.
        </Text>
        <Text style={footerSmall}>
          © {new Date().getFullYear()} {siteName} ·{' '}
          <Link href={siteUrl} style={footerLink}>
            {siteUrl.replace(/^https?:\/\//, '')}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  margin: 0,
  padding: '40px 0',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0 20px',
}
const hero = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  background:
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
  borderRadius: '16px 16px 0 0',
}
const brand = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: 0,
  letterSpacing: '-0.5px',
}
const heroSubtitle = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.85)',
  margin: '6px 0 0',
  letterSpacing: '0.5px',
}
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #eaeaea',
  borderTop: 'none',
  borderRadius: '0 0 16px 16px',
  padding: '32px 28px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#111111',
  margin: '0 0 16px',
}
const h2 = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#111111',
  margin: '0 0 12px',
}
const lead = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const smallText = {
  fontSize: '12px',
  color: '#888888',
  margin: '0 0 8px',
}
const link = { color: '#6366f1', textDecoration: 'underline' }
const linkInline = { color: '#6366f1', textDecoration: 'none', wordBreak: 'break-all' as const }
const linkBox = {
  fontSize: '12px',
  backgroundColor: '#f5f5f7',
  padding: '10px 12px',
  borderRadius: '8px',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
}
const buttonWrap = { textAlign: 'center' as const, margin: '8px 0 24px' }
const primaryButton = {
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const secondaryButton = {
  backgroundColor: '#111111',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const divider = {
  border: 'none',
  borderTop: '1px solid #eaeaea',
  margin: '28px 0',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '24px 0 8px',
}
const footerSmall = {
  fontSize: '11px',
  color: '#bbbbbb',
  textAlign: 'center' as const,
  margin: 0,
}
const footerLink = { color: '#999999', textDecoration: 'none' }
