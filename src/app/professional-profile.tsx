import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, ChevronLeft } from 'lucide-react-native';

import { homeRouteFor, useAuth } from '@/contexts/AuthContext';
import {
  type Category,
  fetchCategories,
  fetchMyProfessional,
  photoSource,
  type ProfessionalProfile,
  saveMyProfessional,
  submitMyProfessional,
  uploadPhoto,
  withdrawMyProfessional,
} from '@/services/professional-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

type Form = {
  photoUrl: string;
  headline: string;
  categoryId: number | null;
  bio: string;
  education: string;
  years: number;
  online: boolean;
  inPerson: boolean;
  city: string;
  radius: number;
  rate: string; // reais, só dígitos
  firstFree: boolean;
};

const STEPS = [
  { title: 'Sua apresentação', subtitle: 'Foto, título do anúncio e área de atuação.' },
  { title: 'Sobre você', subtitle: 'Conte sua história e sua formação.' },
  { title: 'Como você atende', subtitle: 'Online, presencial ou os dois.' },
  { title: 'Valor e envio', subtitle: 'Defina o preço e confira antes de enviar.' },
];
const RADII_KM = [5, 10, 20, 30, 50];

function toForm(p: ProfessionalProfile): Form {
  return {
    photoUrl: p.photo_url ?? '',
    headline: p.headline ?? '',
    categoryId: p.category_id ?? null,
    bio: p.bio ?? '',
    education: p.education ?? '',
    years: p.years_experience,
    online: p.online,
    inPerson: p.in_person,
    city: p.city ?? '',
    radius: p.service_radius_km || 20,
    rate: p.hourly_rate_cents > 0 ? String(Math.round(p.hourly_rate_cents / 100)) : '',
    firstFree: p.first_class_free,
  };
}

function toPayload(form: Form, name: string) {
  return {
    name,
    category_id: form.categoryId ?? undefined,
    headline: form.headline.trim(),
    bio: form.bio.trim(),
    photo_url: form.photoUrl,
    online: form.online,
    in_person: form.inPerson,
    city: form.inPerson ? form.city.trim() : '',
    service_radius_km: form.inPerson ? form.radius : 0,
    hourly_rate_cents: (Number(form.rate) || 0) * 100,
    first_class_free: form.firstFree,
    years_experience: form.years,
    education: form.education.trim(),
  };
}

// Espelha o que o backend exige para enviar o perfil à aprovação.
function validate(step: number, form: Form): string | null {
  if (step === 0) {
    if (!form.photoUrl) return 'Escolha uma foto de perfil.';
    if (!form.headline.trim()) return 'Escreva o título do seu anúncio.';
    if (!form.categoryId) return 'Escolha sua área de atuação.';
  }
  if (step === 1) {
    if (!form.bio.trim()) return 'Conte um pouco sobre você.';
    if (!form.education.trim()) return 'Informe sua formação.';
  }
  if (step === 2) {
    if (!form.online && !form.inPerson) return 'Escolha ao menos uma forma de atendimento.';
    if (form.inPerson && !form.city.trim()) return 'Informe a cidade do atendimento presencial.';
  }
  if (step === 3 && !(Number(form.rate) > 0)) return 'Informe o valor da hora.';
  return null;
}

export default function ProfessionalProfileScreen() {
  const { token, user, refreshProfessional } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  // Perfil que já estava em análise ou no ar: só sai de lá se a pessoa mudar algo.
  const [wasLive, setWasLive] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMyProfessional(), fetchCategories()])
      .then(([mine, list]) => {
        if (!active) return;
        setProfile(mine);
        setWasLive(mine?.status === 'pending' || mine?.status === 'approved');
        setCategories(list);
        if (mine) {
          const loaded = toForm(mine);
          setForm(loaded);
          // Retoma no primeiro passo com pendência; com tudo preenchido, começa pelo primeiro.
          const pending = [0, 1, 2, 3].find((s) => validate(s, loaded) !== null);
          setStep(pending ?? 0);
        }
      })
      .catch(() => active && setError('Não foi possível carregar seu perfil.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Atualiza o perfil guardado no app antes de sair, para a home mostrar a etapa certa.
  const leave = async () => {
    const latest = await refreshProfessional();
    if (router.canGoBack()) router.back();
    else router.replace(homeRouteFor(user, latest));
  };

  const update = (patch: Partial<Form>) => {
    setError(null);
    setTouched(true);
    setForm((current) => (current ? { ...current, ...patch } : current));
  };

  // A primeira alteração tira o perfil da análise ou do ar, para a equipe conferir de novo.
  const ensureEditable = async () => {
    if (profile?.status !== 'pending' && profile?.status !== 'approved') return;
    await withdrawMyProfessional();
    setProfile(await fetchMyProfessional());
    await refreshProfessional();
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      await ensureEditable();
      update({ photoUrl: await uploadPhoto(asset.uri, asset.mimeType) });
    } catch {
      setError('Não foi possível enviar a foto. Tente outra imagem.');
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!form || !profile || busy) return;
    const problem = validate(step, form);
    if (problem) {
      setError(problem);
      return;
    }
    // Sem mudanças num perfil que já estava no ar ou em análise, só navega.
    if (wasLive && !touched) {
      if (step < STEPS.length - 1) setStep(step + 1);
      else void leave();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Cada passo grava o rascunho; assim nada se perde se a pessoa sair.
      await ensureEditable();
      await saveMyProfessional(toPayload(form, profile.name));
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        await submitMyProfessional();
        // Volta para a home, que passa a mostrar "Em análise".
        await leave();
      }
    } catch (e) {
      const message = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível salvar. Verifique a conexão e tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={BRAND_ACCENT} />
      </View>
    );
  }

  if (!profile || !form) {
    return (
      <Notice
        title="Perfil não encontrado"
        text={error ?? 'Você ainda não iniciou um perfil profissional.'}
        onBack={leave}
      />
    );
  }
  const last = step === STEPS.length - 1;
  const category = categories.find((c) => c.id === form.categoryId);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={styles.top}>
        <Pressable
          onPress={() => (step > 0 ? setStep(step - 1) : void leave())}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <ChevronLeft size={28} color="#1a1a1a" />
        </Pressable>
        <View style={styles.progress}>
          {STEPS.map((_, index) => (
            <View key={index} style={styles.segment}>
              {index <= step && (
                <LinearGradient
                  colors={BRAND_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>
          ))}
        </View>
        <Text style={styles.counter}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{STEPS[step].title}</Text>
        <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>

        {step === 0 && profile.status === 'rejected' && profile.rejection_reason ? (
          <View style={styles.rejection}>
            <Text style={styles.rejectionTitle}>Ajustes pedidos pela equipe</Text>
            <Text style={styles.rejectionText}>{profile.rejection_reason}</Text>
          </View>
        ) : null}

        {step === 0 && wasLive && !touched ? (
          <View style={styles.rejection}>
            <Text style={styles.rejectionTitle}>Perfil enviado</Text>
            <Text style={styles.rejectionText}>
              Se você alterar alguma informação, o perfil sai do ar e precisa ser enviado de novo para aprovação.
            </Text>
          </View>
        ) : null}

        {step === 0 && (
          <>
            <Pressable style={styles.photo} onPress={pickPhoto} accessibilityRole="button">
              {form.photoUrl ? (
                <Image source={photoSource(form.photoUrl, token)} style={styles.photoImage} />
              ) : (
                <Camera size={32} color="#9a9ca6" />
              )}
              {busy && (
                <View style={styles.photoBusy}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </Pressable>
            <Text style={styles.photoHint}>{form.photoUrl ? 'Toque para trocar a foto' : 'Toque para escolher uma foto'}</Text>

            <Field label="Título do anúncio">
              <TextInput
                style={styles.input}
                value={form.headline}
                onChangeText={(headline) => update({ headline })}
                placeholder="Ex.: Personal trainer, emagrecimento e hipertrofia"
                placeholderTextColor="#9a9ca6"
                maxLength={90}
              />
            </Field>
            <Field label="Área de atuação">
              <View style={styles.wrap}>
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={form.categoryId === c.id}
                    onPress={() => update({ categoryId: c.id })}
                  />
                ))}
              </View>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Sobre você">
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.bio}
                onChangeText={(bio) => update({ bio })}
                placeholder="Sua trajetória, seu jeito de trabalhar e o que o cliente pode esperar."
                placeholderTextColor="#9a9ca6"
                multiline
                maxLength={800}
              />
            </Field>
            <Field label="Formação e certificações">
              <TextInput
                style={[styles.input, styles.multilineShort]}
                value={form.education}
                onChangeText={(education) => update({ education })}
                placeholder="Ex.: Educação Física (UNIP), pós em Treinamento Esportivo (USP)"
                placeholderTextColor="#9a9ca6"
                multiline
                maxLength={400}
              />
            </Field>
            <Field label="Anos de experiência">
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => update({ years: Math.max(0, form.years - 1) })}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir">
                  <Text style={styles.stepperSign}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{form.years}</Text>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => update({ years: Math.min(60, form.years + 1) })}
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar">
                  <Text style={styles.stepperSign}>+</Text>
                </Pressable>
              </View>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <ToggleRow
              label="Atendimento online"
              hint="Por vídeo, de qualquer lugar."
              value={form.online}
              onChange={(online) => update({ online })}
            />
            <ToggleRow
              label="Atendimento presencial"
              hint="Na casa do cliente ou em local público."
              value={form.inPerson}
              onChange={(inPerson) => update({ inPerson })}
            />
            {form.inPerson && (
              <>
                <Field label="Cidade">
                  <TextInput
                    style={styles.input}
                    value={form.city}
                    onChangeText={(city) => update({ city })}
                    placeholder="Ex.: São Paulo"
                    placeholderTextColor="#9a9ca6"
                  />
                </Field>
                <Field label="Raio de deslocamento">
                  <View style={styles.wrap}>
                    {RADII_KM.map((km) => (
                      <Chip
                        key={km}
                        label={`${km} km`}
                        selected={form.radius === km}
                        onPress={() => update({ radius: km })}
                      />
                    ))}
                  </View>
                </Field>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Valor da hora (R$)">
              <TextInput
                style={styles.input}
                value={form.rate}
                onChangeText={(rate) => update({ rate: rate.replace(/\D/g, '').slice(0, 5) })}
                placeholder="80"
                placeholderTextColor="#9a9ca6"
                keyboardType="number-pad"
              />
            </Field>
            <ToggleRow
              label="Primeira aula grátis"
              hint="Atrai novos clientes."
              value={form.firstFree}
              onChange={(firstFree) => update({ firstFree })}
            />

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resumo</Text>
              <Text style={styles.summaryLine}>{form.headline}</Text>
              <Text style={styles.summaryMuted}>
                {[category?.name, form.years ? `${form.years} anos de experiência` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.summaryMuted}>
                {[form.online && 'Online', form.inPerson && `Presencial em ${form.city} (${form.radius} km)`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.summaryLine}>
                {form.rate ? `R$ ${form.rate}/h` : 'Valor não informado'}
                {form.firstFree ? ' · 1ª aula grátis' : ''}
              </Text>
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={next} disabled={busy} accessibilityRole="button">
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {busy && step === STEPS.length - 1 ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonLabel}>{last ? 'Enviar para aprovação' : 'Continuar'}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Notice({ title, text, onBack }: { title: string; text: string; onBack: () => void | Promise<void> }) {
  return (
    <View style={[styles.screen, styles.center, styles.notice]}>
      <StatusBar style="dark" />
      <Text style={[styles.title, styles.noticeTitle]}>{title}</Text>
      <Text style={[styles.subtitle, styles.noticeText]}>{text}</Text>
      <Pressable style={[styles.button, styles.noticeButton]} onPress={onBack} accessibilityRole="button">
        <LinearGradient
          colors={BRAND_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.buttonLabel}>Voltar ao início</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={styles.chip}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      {selected && (
        <LinearGradient
          colors={BRAND_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: BRAND_ACCENT }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 64 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#EDEEF2', overflow: 'hidden' },
  counter: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#6b6e78', width: 30, textAlign: 'right' },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  title: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 32, color: '#1a1a1a', letterSpacing: -0.4 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78', marginTop: 6, marginBottom: 24 },
  rejection: { backgroundColor: '#FFF1EC', borderRadius: 18, padding: 16, marginBottom: 22, gap: 4 },
  rejectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: BRAND_ACCENT },
  rejectionText: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, color: '#1a1a1a' },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F7',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: 120, height: 120 },
  photoBusy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  photoHint: { fontFamily: FONTS.medium, fontSize: 13, color: '#6b6e78', textAlign: 'center', marginTop: 10, marginBottom: 26 },
  field: { marginBottom: 22, gap: 8 },
  label: { fontFamily: FONTS.bold, fontSize: 15, color: '#1a1a1a' },
  hint: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78' },
  input: {
    backgroundColor: '#F3F4F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: '#1a1a1a',
  },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  multilineShort: { minHeight: 90, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#F3F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipLabel: { fontFamily: FONTS.bold, fontSize: 14, color: '#6b6e78' },
  chipLabelSelected: { color: '#FFFFFF' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stepperButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#F3F4F7', alignItems: 'center', justifyContent: 'center' },
  stepperSign: { fontFamily: FONTS.bold, fontSize: 22, color: '#1a1a1a' },
  stepperValue: { fontFamily: FONTS.extraBold, fontSize: 22, color: '#1a1a1a', minWidth: 32, textAlign: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  toggleText: { flex: 1, gap: 2 },
  summary: { backgroundColor: '#F3F4F7', borderRadius: 22, padding: 20, gap: 6, marginTop: 6 },
  summaryTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#6b6e78', marginBottom: 4 },
  summaryLine: { fontFamily: FONTS.bold, fontSize: 16, color: '#1a1a1a' },
  summaryMuted: { fontFamily: FONTS.regular, fontSize: 14, color: '#6b6e78' },
  error: { fontFamily: FONTS.semiBold, fontSize: 14, color: BRAND_ACCENT, textAlign: 'center', marginTop: 6 },
  footer: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 },
  button: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
  notice: { paddingHorizontal: 28 },
  noticeTitle: { textAlign: 'center' },
  noticeText: { textAlign: 'center', marginBottom: 32 },
  noticeButton: { alignSelf: 'stretch' },
});
