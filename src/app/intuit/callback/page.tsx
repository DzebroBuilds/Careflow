import type { Metadata } from 'next';
import QuickbooksReturn from '@/components/quickbooks-return';
export const metadata:Metadata={title:'Connect QuickBooks | CareFlow',referrer:'no-referrer',robots:{index:false,follow:false}};
export default function IntuitCallback(){return <QuickbooksReturn/>;}
