import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PlansSection } from "@/components/landing/PlansSection";
import { InkySection } from "@/components/landing/InkySection";
import { LeadFormModal, LeadFormType } from "@/components/landing/LeadFormModal";
import { theme } from "@/styles/theme";
import {
  Monitor,
  BarChart3,
  Zap,
  Play,
  Users,
  Brain,
  Smartphone,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  WifiOff,
  ChevronsDown,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Eye,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
    },
  },
};

const FadeInUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Navbar = () => {
  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll();
  const backgroundOpacity = useTransform(scrollY, [0, 100], [0, 0.9]);
  const backdropBlur = useTransform(scrollY, [0, 100], ["0px", "10px"]);
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 0.1]);

  return (
    <motion.header
      style={{
        backgroundColor: useTransform(backgroundOpacity, (o) => `rgba(15, 23, 42, ${o})`),
        backdropFilter: useTransform(backdropBlur, (b) => `blur(${b})`),
        borderBottom: useTransform(borderOpacity, (o) => `1px solid rgba(148, 163, 184, ${o})`),
      }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    >
      <motion.div
        className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-primary via-accent to-secondary origin-left"
        style={{ scaleX: scrollYProgress }}
      />
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="h-10 flex items-center"
          >
            <img 
              src="/logo.svg" 
              alt="MupaMídias" 
              className="h-10 w-auto"
            />
          </motion.div>
        </Link>
        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground/80">
            {[
              { href: "#features", label: "Recursos" },
              { href: "#ai", label: "Inteligência Artificial" },
              { href: "#inky", label: "Inky" },
              { href: "#plans", label: "Planos" },
            ].map((link) => (
              <a key={link.href} href={link.href} className="hover:text-foreground transition-colors relative group py-1">
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden md:block">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">Entrar</Button>
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-accent/10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-sidebar border-border text-foreground pt-20">
                <nav className="flex flex-col gap-6">
                  <a href="#features" className="text-xl font-medium hover:text-primary transition-colors">Recursos</a>
                  <a href="#ai" className="text-xl font-medium hover:text-primary transition-colors">Inteligência Artificial</a>
                  <a href="#inky" className="text-xl font-medium hover:text-primary transition-colors">Inky</a>
                  <a href="#plans" className="text-xl font-medium hover:text-primary transition-colors">Planos</a>
                  <Link to="/login" className="w-full pt-4">
                    <Button className="w-full h-12 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
                      Entrar
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

const Hero = () => {
  const [leadFormType, setLeadFormType] = useState<LeadFormType | null>(null);
  const [heroVideos, setHeroVideos] = useState<string[]>([]);
  const [heroVideoIndex, setHeroVideoIndex] = useState(0);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/hero_videos/manifest.json", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as unknown;
      })
      .then((data) => {
        if (cancelled) return;
        const list = (data as any)?.videos;
        if (Array.isArray(list) && list.every((v) => typeof v === "string")) {
          setHeroVideos(list);
          setHeroVideoIndex(0);
          return;
        }
        setHeroVideos(["/hero_videos/hero.mp4"]);
        setHeroVideoIndex(0);
      })
      .catch(() => {
        if (cancelled) return;
        setHeroVideos(["/hero_videos/hero.mp4"]);
        setHeroVideoIndex(0);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el) return;
    el.load();
    const p = el.play();
    if (p && typeof (p as Promise<void>).catch === "function") (p as Promise<void>).catch(() => undefined);
  }, [heroVideoIndex, heroVideos]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <LeadFormModal isOpen={!!leadFormType} onClose={() => setLeadFormType(null)} type={leadFormType || "general"} />
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black">
        <video
          ref={heroVideoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={heroVideos[heroVideoIndex] ?? "/hero_videos/hero.mp4"}
          autoPlay
          muted
          loop={heroVideos.length <= 1}
          playsInline
          preload="metadata"
          onEnded={() => {
            if (heroVideos.length <= 1) return;
            setHeroVideoIndex((idx) => (idx + 1) % heroVideos.length);
          }}
          onError={() => {
            if (heroVideos.length <= 1) return;
            setHeroVideoIndex((idx) => (idx + 1) % heroVideos.length);
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(6,182,212,0.15),transparent_55%)]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center justify-center text-center min-h-[calc(100vh-5rem)]">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col items-center">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/35 border border-white/15 mb-7 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-white/85">A nova infraestrutura de mídia para o varejo</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl md:text-7xl font-semibold mb-6 leading-[1.05] tracking-tight text-white"
          >
            <span className="text-[#22d3ee]">
              Digital signage, retail media e trade marketing
            </span>
            <br />
            em uma única plataforma
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg sm:text-xl text-white/75 mb-10 max-w-3xl mx-auto leading-relaxed">
            Monetize TVs no ponto de venda, gerencie campanhas e transforme telas em canais de comunicação e receita — da loja ao corporativo.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button
              size="lg"
              onClick={() => setLeadFormType("general")}
              className="w-full sm:w-auto min-h-[3.5rem] h-auto py-4 px-6 sm:px-10 text-base sm:text-lg rounded-full bg-primary hover:bg-primary/90 border-0 shadow-lg shadow-black/30 whitespace-normal leading-tight text-primary-foreground"
            >
              <Zap className="mr-2 h-5 w-5 fill-current shrink-0" />
              <span>Começar Agora</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLeadFormType("demo")}
              className="w-full sm:w-auto min-h-[3.5rem] h-auto py-4 px-6 sm:px-10 text-base sm:text-lg rounded-full border-white/30 bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm whitespace-normal leading-tight"
            >
              <Play className="mr-2 h-5 w-5 shrink-0" />
              <span>Ver demo</span>
            </Button>
          </motion.div>

          {/* Floating Elements */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1 }}
              className="flex flex-col items-center gap-2 cursor-pointer group"
              onClick={() => {
                const featuresSection = document.getElementById("features");
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <span className="text-xs text-white/70 group-hover:text-white transition-colors font-medium tracking-widest uppercase">
                Descubra Mais
              </span>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="p-2 rounded-full bg-black/30 border border-white/15 group-hover:bg-black/40 group-hover:border-white/25 transition-all backdrop-blur-sm"
              >
                <ChevronsDown className="w-5 h-5 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Features = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const features = [
    {
      icon: Brain,
      title: "Visão Computacional Avançada",
      description: "Nossa IA detecta idade, gênero e emoções de quem olha para a tela, permitindo métricas precisas de audiência sem violar a privacidade.",
    },
    {
      icon: Zap,
      title: "Mídia Programática Real-Time",
      description: "O conteúdo muda instantaneamente quando seu público-alvo se aproxima. Mostre o anúncio certo para a pessoa certa no momento exato.",
    },
    {
      icon: Search,
      title: "Terminal de Consulta Inteligente",
      description: "Muito mais que preço. Ao ler um código de barras, exiba vídeos, avaliações e produtos relacionados para aumentar o ticket médio.",
    },
    {
      icon: WifiOff,
      title: "Operação Offline-First",
      description: "Sua rede nunca para. O player baixa todo o conteúdo e continua rodando perfeitamente mesmo se a internet cair por dias.",
    },
    {
      icon: Monitor,
      title: "Gestão de Dispositivos Remota",
      description: "Comandos de reboot, atualização de app, limpeza de cache e logs em tempo real, tudo controlado pelo painel administrativo.",
    },
    {
      icon: BarChart3,
      title: "Analytics de Atenção",
      description: "Saiba exatamente quanto tempo as pessoas olham para cada anúncio e qual a efetividade real das suas campanhas em cada ponto de venda.",
    },
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % features.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <section id="features" className="py-12 md:py-24 bg-sidebar relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Poderoso. Simples. <span className="text-primary">Inteligente.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Uma suíte completa de ferramentas projetada para escalar sua operação de digital signage.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 p-2 rounded-full bg-card/30 hover:bg-card/40 text-foreground transition-all backdrop-blur-sm border border-border/30"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 p-2 rounded-full bg-card/30 hover:bg-card/40 text-foreground transition-all backdrop-blur-sm border border-border/30"
            aria-label="Próximo"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Carousel Content */}
          <div className="overflow-hidden px-4">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm shadow-2xl shadow-primary/10"
            >
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center shrink-0 border border-white/10 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                  {(() => {
                    const Icon = features[currentIndex].icon;
                    return <Icon className="w-16 h-16 md:w-24 md:h-24 text-primary" strokeWidth={1.5} />;
                  })()}
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                    <span className="text-sm font-mono text-primary">
                      {String(currentIndex + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
                    </span>
                    <div className="h-px w-12 bg-primary/50" />
                  </div>

                  <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">
                    {features[currentIndex].title}
                  </h3>
                  <p className="text-lg text-white/70 leading-relaxed">
                    {features[currentIndex].description}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Dots Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {features.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-8 bg-primary" : "bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Ir para slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const AISection = () => {
  return (
    <section id="ai" className="py-12 md:py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]"
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <FadeInUp>
            <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6">
              MUPA AI Vision
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Sua tela agora tem <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                olhos inteligentes
              </span>
            </h2>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Não apenas exiba conteúdo. Entenda como ele performa. Nossa tecnologia de visão computacional analisa
              anonimamente quem está olhando para sua tela em tempo real.
            </p>

            <div className="space-y-6">
              {[
                { title: "Detecção de Emoções", desc: "Saiba se seu público está feliz, surpreso ou neutro." },
                { title: "Demografia em Tempo Real", desc: "Identifique idade e gênero para segmentar anúncios." },
                { title: "Mapa de Calor de Atenção", desc: "Descubra quais áreas da tela chamam mais atenção." },
              ].map((item, i) => (
                <FadeInUp key={i} delay={i * 0.1} className="flex gap-4 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all duration-300">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg group-hover:text-primary transition-colors">{item.title}</h4>
                    <p className="text-white/70">{item.desc}</p>
                  </div>
                </FadeInUp>
              ))}
            </div>
          </FadeInUp>

          <div className="relative">
            <FadeInUp delay={0.2}>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl group hover:shadow-primary/20 transition-all duration-500">
                {/* Simulated Camera Feed UI */}
                <div className="aspect-video bg-gray-900 relative overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <span className="text-gray-600">Camera Feed Simulation</span>
                  </div>

                  {/* AI Overlays */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-primary/80 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  >
                    <div className="absolute -top-6 left-0 flex gap-2">
                      <div className="bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                        Mulher, 25-34
                      </div>
                      <div className="bg-primary/20 backdrop-blur-md text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/30">
                        98% Conf.
                      </div>
                    </div>
                  </motion.div>

                  {/* Scan Line Animation */}
                  <motion.div
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 w-full h-px bg-primary shadow-[0_0_20px_rgba(6,182,212,0.8)] opacity-50"
                  />
                </div>

                {/* Data Panel */}
                <div className="bg-sidebar/70 backdrop-blur-md p-4 border-t border-border/40 grid grid-cols-3 gap-4 divide-x divide-border/40">
                  <div className="text-center px-2">
                    <div className="text-2xl font-bold text-foreground mb-1">42</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Pessoas</div>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-2xl font-bold text-green-400 mb-1">8.5s</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Tempo Médio</div>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-2xl font-bold text-primary mb-1">Happy</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Emoção</div>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </div>
    </section>
  );
};

const Landing = () => {
  const year = new Date().getFullYear();

  return (
    <div className="dark min-h-screen bg-sidebar text-foreground selection:bg-primary/30">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <AISection />
        <InkySection />
        <PlansSection />
      </main>

      <footer className="py-10 md:py-14 border-t border-border/40 bg-sidebar">
        <FadeInUp className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.svg" 
                  alt="MupaMídias" 
                  className="h-10 w-auto"
                />
              </div>

              <p className="text-sm text-muted-foreground max-w-xl">
                Plataforma completa de digital signage com inteligência de público, conteúdo automatizado e analytics para transformar telas em resultados.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full bg-primary hover:bg-primary/90">
                  <a href="https://wa.me/5551995643344" target="_blank" rel="noreferrer">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Falar no WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-border">
                  <a href="mailto:contato@mupa.app">
                    Enviar email
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-sm font-semibold text-foreground">Produto</div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
                <a href="#ai" className="hover:text-foreground transition-colors">Inteligência Artificial</a>
                <a href="#inky" className="hover:text-foreground transition-colors">Inky</a>
                <a href="#plans" className="hover:text-foreground transition-colors">Planos</a>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-sm font-semibold text-foreground">Contato</div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="tel:+5551995643344" className="hover:text-foreground transition-colors">
                  (51) 99564-3344
                </a>
                <a href="mailto:contato@mupa.app" className="hover:text-foreground transition-colors">
                  contato@mupa.app
                </a>
                <a href="https://wa.me/5551995643344" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {year} Mupa Desenvolvimento de Solucoes Tecnologicas Ltda — Todos os direitos reservados.
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="mailto:contato@mupa.app?subject=Privacidade" className="hover:text-foreground transition-colors">
                Privacidade
              </a>
              <a href="mailto:contato@mupa.app?subject=Termos de uso" className="hover:text-foreground transition-colors">
                Termos
              </a>
              <a href="https://wa.me/5551995643344" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
                Suporte
              </a>
            </div>
          </div>
        </FadeInUp>
      </footer>
    </div>
  );
};

export default Landing;
