import { User } from '@/context/AppContext';
import { Menu } from 'lucide-react'
import React from 'react'

interface ChatHeaderProps{
    user: User | null;
    setSidebarOpen:(open: boolean)=>void
    isTyping: boolean;

}

const ChatHeader = ({user,setSidebarOpen,isTyping}:ChatHeaderProps) => {
  return (
    <>
      {/*mobile menu toggle button*/}
      <div className="sm:hidden fixed top-4 right-4 z-30">
        <button className='p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors
        ' onClick={()=>setSidebarOpen(true)}>
            <Menu className='w-5 h-5 text-gray-200'></Menu>
        </button>
      </div>
    </>
  )
}

export default ChatHeader
