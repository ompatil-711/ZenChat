"use client"
import Loading from '@/components/Loading'
import { useAppData } from '@/context/AppContext'
import { useRouter } from 'next/navigation'; 
import React, { useEffect } from 'react'

const ZenChat = () => {
  const {loading,isAuth} = useAppData()
  const router = useRouter()
  useEffect(()=>{
    if(!isAuth && !loading){
      router.push("/login")
    }
  },[isAuth,router,loading])

  if(loading) return <Loading/>
  if(!isAuth) return null
  return (
    <div>
      <h1>Zenchat</h1>
    </div>
  )
}

export default ZenChat
