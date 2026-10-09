import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowUp, ChevronLeft } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { photoSource } from '@/services/professional-service';
import {
  fetchMessages,
  fetchRequest,
  sendMessage,
  type ChatMessage,
  type ServiceRequest,
} from '@/services/request-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

// A primeira bolha é o texto do pedido (id 0); as demais vêm do backend.
type Message = { id: number; mine: boolean; text: string; at: string };

// Intervalo da busca por mensagens novas enquanto a conversa está aberta.
const POLL_MS = 3000;

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function Bubble({ message }: { message: Message }) {
  return (
    <View style={[styles.bubbleRow, message.mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, message.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, message.mine && styles.bubbleTextMine]}>{message.text}</Text>
        <Text style={[styles.bubbleTime, message.mine && styles.bubbleTimeMine]}>{time(message.at)}</Text>
      </View>
    </View>
  );
}

// Conversa de um pedido aceito. As mensagens novas chegam por polling: a tela pergunta ao
// backend a cada POLL_MS, só pelo que é mais novo que a última mensagem conhecida.
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const { user, token } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>();
  const [received, setReceived] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const list = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRequest(requestId)
      .then((r) => !cancelled && setRequest(r))
      .catch(() => !cancelled && setRequest(null));
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const append = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setReceived((current) => {
      const known = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return fresh.length ? [...current, ...fresh] : current;
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
  }, []);

  const poll = useCallback(async () => {
    try {
      append(await fetchMessages(requestId, lastId.current));
    } catch {
      // Falha de rede passageira: a próxima busca tenta de novo.
    }
  }, [requestId, append]);

  // Busca ao abrir e repete enquanto a tela estiver em foco.
  useFocusEffect(
    useCallback(() => {
      void poll();
      const timer = setInterval(() => void poll(), POLL_MS);
      return () => clearInterval(timer);
    }, [poll]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const iAmClient = !!request && request.client_id === user?.id;
  const otherName = request ? (iAmClient ? request.professional_name : request.client_name) : '';
  const open = request?.status === 'accepted';

  const messages: Message[] = request
    ? [
        { id: 0, mine: iAmClient, text: request.message, at: request.created_at },
        ...received.map((m) => ({ id: m.id, mine: m.sender_id === user?.id, text: m.body, at: m.created_at })),
      ]
    : [];

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      append([await sendMessage(requestId, text)]);
      setDraft('');
    } catch {
      Alert.alert('Não foi possível enviar', 'Confira sua conexão e se o atendimento continua aberto.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <ChevronLeft size={28} color="#1a1a1a" />
        </Pressable>
        {request && iAmClient ? (
          <Image source={photoSource(request.professional_photo_url, token)} style={styles.avatar} />
        ) : null}
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
          {request ? (
            <Text style={styles.headerSub}>{request.mode === 'online' ? 'Online' : 'Presencial'}</Text>
          ) : null}
        </View>
      </View>

      {request === undefined ? (
        <ActivityIndicator style={styles.loader} />
      ) : request === null ? (
        <Text style={styles.empty}>Não foi possível abrir esta conversa.</Text>
      ) : (
        <>
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={({ item }) => <Bubble message={item} />}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          />

          {open ? (
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Escreva uma mensagem"
                placeholderTextColor="#9a9da6"
                multiline
                style={styles.input}
              />
              <Pressable
                onPress={send}
                disabled={!draft.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel="Enviar"
                style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}>
                <LinearGradient
                  colors={BRAND_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <ArrowUp size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Text style={styles.closed}>Este atendimento foi encerrado. A conversa fica só para consulta.</Text>
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D8DAE0',
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E4E6EC' },
  headerText: { flex: 1 },
  headerName: { fontFamily: FONTS.bold, fontSize: 17, color: '#1a1a1a' },
  headerSub: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78' },
  loader: { marginTop: 60 },
  empty: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78', textAlign: 'center', marginTop: 60, paddingHorizontal: 20 },
  messages: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  closed: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78', textAlign: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, borderRadius: 18 },
  bubbleTheirs: { backgroundColor: '#F3F4F7', borderBottomLeftRadius: 6 },
  bubbleMine: { backgroundColor: BRAND_ACCENT, borderBottomRightRadius: 6 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 21, color: '#1a1a1a' },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTime: { fontFamily: FONTS.regular, fontSize: 11, color: '#9a9da6', alignSelf: 'flex-end', marginTop: 2 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D8DAE0',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 22,
    backgroundColor: '#F3F4F7',
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#1a1a1a',
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sendDisabled: { opacity: 0.4 },
});
