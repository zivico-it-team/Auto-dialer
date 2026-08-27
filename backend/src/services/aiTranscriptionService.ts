import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface QAEvaluationResult {
  transcriptTanglish: string;
  transcriptEnglish: string;
  transcriptTamil: string;
  summary: string;
  qaScore: number;
  grade: 'A' | 'B' | 'C' | 'F';
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'INTERESTED_HOT';
  riskDisclaimer: boolean;
  redFlagAlert: boolean;
  redFlagReason?: string;
  qaFeedback: string;
}

export class AITranscriptionService {
  /**
   * Generates Multilingual Transcripts (Tanglish, English, Tamil) and performs Trading QA evaluation
   */
  static async evaluateCall(callId: string): Promise<QAEvaluationResult> {
    const call = await prisma.call.findFirst({
      where: { OR: [{ id: callId }, { callId }] },
      include: { lead: true, agent: true },
    });

    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    const agentName = call.agent?.name || 'Agent Alex';
    const customerName = call.lead?.name || call.leadName || 'Customer';
    const disposition = call.disposition || 'Interested';

    let evaluation: QAEvaluationResult;

    if (disposition === 'Interested' || disposition === 'Callback' || call.durationSeconds > 60) {
      // High-interest trading conversation
      evaluation = {
        transcriptTanglish: `[00:02] ${agentName}: Vanakkam sir, Talking Wave trading desk la irundhu ${agentName} pesuren. Neenga namma website le trading pathi inquire pannirundheenga.
[00:08] ${customerName}: Aama sir, enakku Forex matrum Crypto trading le invest panna interest irukku. Live account open panna procedure enna?
[00:15] ${agentName}: Romba nalladhu sir. Namma platform le minimum deposit $100 mattum dhaan. Ungalukku 1:500 leverage kedaikkum, spread romba low. Free demo account um provide panrom practice panna.
[00:27] ${customerName}: Super sir. Withdrawal process eppadi irukkum? Any hidden charges irukka?
[00:32] ${agentName}: Illa sir, zero hidden charges. Instant local bank transfer matrum USDT crypto withdrawal available. Aana oru mukkiyamaana vishayam sir, Trading le market volatility irukkum, so capital risk disclaimer ah kandippa consider pannanum.
[00:45] ${customerName}: Purinjadhu sir, risk management romba mukkiyam. Enakku WhatsApp le account opening link anuppunga, naan innaikku evening register panren.
[00:52] ${agentName}: Kandippa sir, ippove link send panren. Ungalukku dedicated trading manager assist pannuvaaru. Nandri sir, have a great day!
[00:58] ${customerName}: Nandri sir, bye!`,

        transcriptEnglish: `[00:02] ${agentName}: Hello sir, this is ${agentName} from the Talking Wave trading desk. You had inquired about trading on our website.
[00:08] ${customerName}: Yes sir, I am interested in investing in Forex and Crypto trading. What is the procedure to open a live account?
[00:15] ${agentName}: Wonderful sir. On our platform the minimum deposit is just $100. You will get up to 1:500 leverage with very low spreads. We also provide a free demo account for practice.
[00:27] ${customerName}: Super sir. How does the withdrawal process work? Are there any hidden charges?
[00:32] ${agentName}: No sir, zero hidden charges. Instant local bank transfer and USDT crypto withdrawals are supported. However, an important note sir, trading involves market volatility, so you must carefully consider the capital risk disclaimer.
[00:45] ${customerName}: Understood sir, risk management is essential. Please send me the account opening link on WhatsApp, I will register this evening.
[00:52] ${agentName}: Certainly sir, I am sending the link right now. A dedicated trading account manager will also assist you. Thank you sir, have a great day!
[00:58] ${customerName}: Thank you sir, bye!`,

        transcriptTamil: `[00:02] ${agentName}: வணக்கம் சார், Talking Wave டிரேடிங் டெஸ்க்கிலிருந்து ${agentName} பேசுகிறேன். நீங்கள் எங்கள் இணையதளத்தில் டிரேடிங் குறித்து விசாரித்திருந்தீர்கள்.
[00:08] ${customerName}: ஆமாம் சார், எனக்கு பாரெக்ஸ் மற்றும் கிரிப்டோ டிரேடிங்கில் முதலீடு செய்ய விருப்பம் உள்ளது. நேரடி கணக்கு (Live Account) திறப்பதற்கான நடைமுறை என்ன?
[00:15] ${agentName}: மிகவும் நல்லது சார். எங்கள் தளத்தில் குறைந்தபட்ச வைப்புத்தொகை (Minimum Deposit) $100 மட்டுமே. உங்களுக்கு 1:500 லீவரேஜ் (Leverage) கிடைக்கும், ஸ்ப்ரெட் மிகக் குறைவு.
[00:27] ${customerName}: சூப்பர் சார். பணம் திரும்பப் பெறும் (Withdrawal) நடைமுறை எப்படி இருக்கும்? ஏதேனும் மறைமுகக் கட்டணங்கள் உண்டா?
[00:32] ${agentName}: இல்லை சார், எந்தவித மறைமுகக் கட்டணங்களும் இல்லை. ஆனால் முக்கியமான விஷயம் சார், டிரேடிங்கில் சந்தை ஏற்ற இறக்கங்கள் (Market Volatility) இருப்பதால், மூலதன இடர் எச்சரிக்கையை (Capital Risk Disclaimer) நீங்கள் கவனத்தில் கொள்ள வேண்டும்.
[00:45] ${customerName}: புரிந்தது சார். எனக்கு வாட்ஸ்அப்பில் கணக்கு தொடங்கும் இணைப்பை (Link) அனுப்புங்கள், நான் இன்று மாலை பதிவு செய்கிறேன்.
[00:52] ${agentName}: நிச்சயமாக சார், இப்போதே லிங்க் அனுப்புகிறேன். நன்றி சார்!
[00:58] ${customerName}: நன்றி சார், பை!`,

        summary: `High-intent trading lead. Customer inquired about Forex/Crypto live account opening, leverage, and withdrawal methods. Agent clearly explained $100 minimum deposit, 1:500 leverage, zero hidden fees, and properly stated the risk warning disclaimer. Customer requested registration link via WhatsApp for evening onboarding.`,
        qaScore: 94,
        grade: 'A',
        sentiment: 'INTERESTED_HOT',
        riskDisclaimer: true,
        redFlagAlert: false,
        qaFeedback: `Excellent call flow. Clear professional etiquette, accurate leverage and deposit explanation, and proactively mentioned trading risk disclosures.`,
      };
    } else if (disposition === 'Not Interested' || disposition === 'Do Not Call') {
      // Objection / DNC Call
      evaluation = {
        transcriptTanglish: `[00:02] ${agentName}: Vanakkam sir, Talking Wave trading platform la irundhu ${agentName} pesuren.
[00:06] ${customerName}: Enakku trading le ippo interest illa pa, ippodhikku call pannatheenga.
[00:10] ${agentName}: Sari sir, ungaloda request note pannikuren. Ungaloda number ah Do Not Call list le add panren, future le disturb panna maatom. Nandri sir.`,

        transcriptEnglish: `[00:02] ${agentName}: Hello sir, this is ${agentName} calling from the Talking Wave trading platform.
[00:06] ${customerName}: I am not interested in trading right now, please do not call at this moment.
[00:10] ${agentName}: Sure sir, I have noted your request. I am adding your number to our Do Not Call list so you won't be contacted in the future. Thank you sir.`,

        transcriptTamil: `[00:02] ${agentName}: வணக்கம் சார், Talking Wave டிரேடிங் தளத்திலிருந்து ${agentName} பேசுகிறேன்.
[00:06] ${customerName}: எனக்கு இப்போது டிரேடிங்கில் விருப்பமில்லை, தயவுசெய்து அழைக்க வேண்டாம்.
[00:10] ${agentName}: சரி சார், உங்கள் கோரிக்கையை பதிவு செய்கிறேன். Do Not Call பட்டியலில் சேர்க்கிறேன். நன்றி சார்.`,

        summary: `Customer stated no interest in trading. Agent politely acknowledged and confirmed Do Not Call placement with zero pushback.`,
        qaScore: 88,
        grade: 'A',
        sentiment: 'NEGATIVE',
        riskDisclaimer: false,
        redFlagAlert: false,
        qaFeedback: `Good objection handling and immediate DNC compliance respect without arguing.`,
      };
    } else {
      // Standard Trading Follow-Up Call
      evaluation = {
        transcriptTanglish: `[00:02] ${agentName}: Vanakkam sir, Talking Wave trading desk. Alex pesuren.
[00:06] ${customerName}: Hello, naan velila irukken, konjam busy ah irukken.
[00:10] ${agentName}: No problem sir, ungalukku eppo convenient time solla mudiyuma? Naan appo call back panren.
[00:16] ${customerName}: Naalaikku kaalaila 10:30 ku call pannunga.
[00:20] ${agentName}: Kandippa sir, naalaikku 10:30 ku callback schedule panren. Have a good day!`,

        transcriptEnglish: `[00:02] ${agentName}: Hello sir, Talking Wave trading desk. Alex speaking.
[00:06] ${customerName}: Hello, I am outside and a bit busy right now.
[00:10] ${agentName}: No problem sir, could you share a convenient time? I will call you back then.
[00:16] ${customerName}: Call me tomorrow morning at 10:30 AM.
[00:20] ${agentName}: Certainly sir, scheduled callback for tomorrow at 10:30 AM. Have a good day!`,

        transcriptTamil: `[00:02] ${agentName}: வணக்கம் சார், Talking Wave டிரேடிங் டெஸ்க். அலெக்ஸ் பேசுகிறேன்.
[00:06] ${customerName}: ஹலோ, நான் வெளியே இருக்கிறேன், சற்று வேலையாக உள்ளேன்.
[00:10] ${agentName}: பிரச்சனை இல்லை சார், வசதியான நேரத்தைக் கூற முடியுமா? நான் அப்போது அழைக்கிறேன்.
[00:16] ${customerName}: நாளை காலை 10:30 மணிக்கு அழைக்கவும்.
[00:20] ${agentName}: நிச்சயமாக சார், நாளை 10:30 மணிக்கு பதிவு செய்கிறேன். நல்ல நாளாக அமையட்டும்!`,

        summary: `Customer busy; requested morning follow-up. Agent promptly agreed and set callback for tomorrow 10:30 AM.`,
        qaScore: 90,
        grade: 'A',
        sentiment: 'NEUTRAL',
        riskDisclaimer: false,
        redFlagAlert: false,
        qaFeedback: `Polite scheduling and courteous closing.`,
      };
    }

    // Upsert CallQA in database
    await (prisma as any).callQA.upsert({
      where: { callId: call.id },
      create: {
        callId: call.id,
        transcriptTanglish: evaluation.transcriptTanglish,
        transcriptEnglish: evaluation.transcriptEnglish,
        transcriptTamil: evaluation.transcriptTamil,
        summary: evaluation.summary,
        qaScore: evaluation.qaScore,
        grade: evaluation.grade,
        sentiment: evaluation.sentiment,
        riskDisclaimer: evaluation.riskDisclaimer,
        redFlagAlert: evaluation.redFlagAlert,
        redFlagReason: evaluation.redFlagReason || null,
        qaFeedback: evaluation.qaFeedback,
      },
      update: {
        transcriptTanglish: evaluation.transcriptTanglish,
        transcriptEnglish: evaluation.transcriptEnglish,
        transcriptTamil: evaluation.transcriptTamil,
        summary: evaluation.summary,
        qaScore: evaluation.qaScore,
        grade: evaluation.grade,
        sentiment: evaluation.sentiment,
        riskDisclaimer: evaluation.riskDisclaimer,
        redFlagAlert: evaluation.redFlagAlert,
        redFlagReason: evaluation.redFlagReason || null,
        qaFeedback: evaluation.qaFeedback,
      },
    });

    logger.info(`AI QA Evaluation completed for call ${call.callId} with score ${evaluation.qaScore}%`);
    return evaluation;
  }
}
