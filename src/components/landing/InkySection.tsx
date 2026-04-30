import { motion } from "framer-motion";
import { Sparkles, MessageSquare, BarChart3, Zap, Brain } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Assistente Conversacional",
    description: "Converse com a Inky em linguagem natural. Peça relatórios, ajuste campanhas ou tire dúvidas.",
  },
  {
    icon: Brain,
    title: "Insights Automáticos",
    description: "A IA analisa seus dados e sugere ações para melhorar performance e engajamento.",
  },
  {
    icon: BarChart3,
    title: "Relatórios em Segundos",
    description: "Gere relatórios completos de audiência e conversão com um simples comando.",
  },
  {
    icon: Zap,
    title: "Ações Inteligentes",
    description: "A Inky pode acionar campanhas, pausar conteúdos ou alertar sobre anomalias.",
  },
];

export function InkySection() {
  return (
    <section id="inky" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px]"
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Inky AI Assistant
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              Sua IA pessoal para
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                gestão de mídia
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-white/70 mb-12 leading-relaxed"
            >
              A Inky é sua assistente virtual inteligente que entende seus dados,
              sugere ações e executa comandos. Simples converse com ela.
            </motion.p>

            <div className="space-y-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-1">{feature.title}</h4>
                      <p className="text-white/60">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Chat Interface Mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-2xl">
              {/* Chat Header */}
              <div className="bg-muted/50 border-b border-border/50 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-foreground font-semibold">Inky</h4>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Online
                  </span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-4 space-y-4 h-[400px] overflow-y-auto">
                {/* Bot Message */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted/50 rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
                    <p className="text-sm text-foreground">
                      Olá! Sou a Inky, sua assistente de digital signage. Como posso ajudar hoje?
                    </p>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex gap-3 justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3 max-w-[80%]">
                    <p className="text-sm">
                      Mostre o relatório de audiência da loja Centro nesta semana
                    </p>
                  </div>
                </div>

                {/* Bot Response with Data */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted/50 rounded-2xl rounded-tl-sm p-3 max-w-[90%] space-y-3">
                    <p className="text-sm text-foreground">
                      📊 Aqui está o relatório da <strong>Loja Centro</strong> (últimos 7 dias):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-card/50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-primary">1.2k</div>
                        <div className="text-xs text-muted-foreground">Impressões</div>
                      </div>
                      <div className="bg-card/50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-green-500">5.4s</div>
                        <div className="text-xs text-muted-foreground">Tempo Médio</div>
                      </div>
                      <div className="bg-card/50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-accent">+12%</div>
                        <div className="text-xs text-muted-foreground">vs Semana</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Insight:</strong> A campanha "Tech Week" teve 40% mais engajamento. 
                      Sugiro estendê-la para mais lojas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-border/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite uma mensagem..."
                    className="flex-1 bg-muted border border-border/50 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    readOnly
                  />
                  <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
