
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  address: string;
  notes: string;
  frontImage: string | null;
  backImage: string | null;
  followUp?: FollowUp;
}

export interface FollowUp {
  method: 'email' | 'text' | 'call';
  dateTime: string;
  generatedContent: {
    subject?: string;
    body: string;
  };
  status: 'pending' | 'scheduled';
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}