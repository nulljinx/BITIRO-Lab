import type {ButtonHTMLAttributes} from 'react';
import type {LucideIcon} from 'lucide-react';
export function IconButton({icon:Icon,label,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon:LucideIcon;label:string}) {
 return <button {...props} type="button" className={`icon-button ${props.className??''}`} aria-label={label} title={label}><Icon size={18} aria-hidden="true"/></button>;
}
export function PrimaryButton(props:ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} className={`primary ${props.className??''}`}/>;}
export function SecondaryButton(props:ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} className={`secondary ${props.className??''}`}/>;}
