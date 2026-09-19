"use client"
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { BriefcaseBusiness, Mail, Search, Calendar, Sparkles } from "lucide-react";


const quickSuggestions = [
  {
    label: "Find Jobs",
    prompt: "Find the latest AI developer jobs posted this week that match my skillset",
  },
  {
    label: "Inbox Summary",
    prompt: "Check my inbox and summarize the most important emails, action items, and follow-ups",
  },
  {
    label: "Research Topic",
    prompt: "Research a topic across the web, compare multiple sources, and generate a concise breakdown",
  },
  {
    label: "Plan My Day",
    prompt: "Check my calendar and upcoming tasks, then create a prioritized schedule for today",
  },
  {
    label: "Reddit Trends",
    prompt: "Find trending Reddit discussions about AI tools and agent workflows from the past 24 hours",
  },
];


const templates = [
  {
    title: "Find latest jobs",
    description: "Search the web for the latest jobs matching my profile.",
    icon: BriefcaseBusiness,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    border: "hover:border-orange-300",
    glow: "hover:shadow-orange-100",
  },
  {
    title: "Daily inbox summary",
    description: "Summarize important emails and highlight what needs my attention.",
    icon: Mail,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    border: "hover:border-blue-300",
    glow: "hover:shadow-blue-100",
  },
  {
    title: "Research a topic",
    description: "Search the web and create a useful research summary for me.",
    icon: Search,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    border: "hover:border-purple-300",
    glow: "hover:shadow-purple-100",
  },
];

function CreateAgent(){
    const [prompt,setPrompt]=useState('')
    return(
        <div className='mt-5'>
            <div>
                <h2 className='text-2xl font-semibold tracking-tight'>Create New Agent</h2>
                <p className='mt-1 text-sm text-muted-foreground'>Ask what type of agent you want to create, Type your goal, task, and workflow</p>
            </div>
            {/* promptbox */}
            <div className='w-full border rounded-2xl bg-background p-3 mt-3 shadow-lg shadow-puple-100 hover:shadow-purple-200'>
                <textarea placeholder='Describe the agent you want to create...' className='min-h-[90px] w-full resize-none bg-transparent px-2 py-2 text-sm outline-none' value={prompt} onChange={(event)=>setPrompt(event.target.value)}/>
                <div className='flex justify-between items-center'>
                    <div>
                        <Button variant={'ghost'} size=  {'icon'}><Plus />
                        </Button>
                    </div>
                    <Button size={'icon'} className={'h-9 w-9 rounded-full bg-purple-600'}>
                        <ArrowUp/>
                    </Button>
                </div>
            </div>

            <div className='mt-3 flex gap-2'>
                {quickSuggestions.map((suggestion,index)=>(
                    <Button variant={'outline'} onClick={()=>setPrompt(suggestion.prompt)} className='hover:text-purple-700 hover:bg-purple-200 hover:border-purple-700'>
                        {suggestion.label}
                    </Button>
                ))}
            </div>

            <div className='mt-10'>
                <h2 className='flex text-lg justify-between items-center font-semibold'>Get Started <span className='text-sm font-medium'>View All</span></h2>
                <div className='grid grid-cols-1  gap-4 md:grid-cols-3 mt-3'>
                    {templates.map((template,index)=>(
                        <div className={`border rounded-2xl p-5 hover:cursor-pointer hover:shadow-lg ${template.border} ${template.glow}`}>
                            <template.icon className={`h-12 w-12 p-2 ${template.iconBg} ${template.iconColor} rounded-lg `} />
                            <div className='mt-6'>
                                <h2 className='font-semibold text-foreground'>{template.title}</h2>
                                <p className='text-sm mt-2 leading-5 text-muted-foreground'>{template.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default CreateAgent;