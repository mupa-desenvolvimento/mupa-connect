import { motion } from "framer-motion";
import { Check, Zap, Building2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const plans = [
  {
    name: "Essencial",
    icon: Store,
    price: "R$ 47",
    period: "/mês por tela",
    description: "Ideal para pequenos varejos",
    features: [
      "Até 10 telas",
      "Player offline-first",
      "Gerenciamento de playlists",
      "Suporte por email",
    ],
    cta: "Começar Grátis",
    popular: false,
  },
  {
    name: "Profissional",
    icon: Zap,
    price: "R$ 97",
    period: "/mês por tela",
    description: "Para redes em crescimento",
    features: [
      "Até 50 telas",
      "Todas as features do Essencial",
      "Analytics avançado",
      "IA de detecção de público",
      "Suporte prioritário",
    ],
    cta: "Solicitar Demo",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Building2,
    price: "Personalizado",
    period: "",
    description: "Soluções sob medida",
    features: [
      "Telas ilimitadas",
      "API dedicada",
      "Integrações customizadas",
      "SLA garantido",
      "Gerente de conta dedicado",
    ],
    cta: "Falar com Vendas",
    popular: false,
  },
];

export function PlansSection() {
  return (
    <section id="plans" className="py-24 bg-sidebar relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          >
            Planos para todo tamanho de <span className="text-primary">negócio</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Escolha o plano ideal para sua operação de digital signage
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full border-border/40 bg-card/50 backdrop-blur-sm ${
                  plan.popular ? "border-primary/50 shadow-lg shadow-primary/10" : ""
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm">{plan.description}</p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
