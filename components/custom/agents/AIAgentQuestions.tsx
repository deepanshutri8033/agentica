"use client";

import React, { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClarificationQuestion } from "./createAgent";

type Props = {
  questionList: ClarificationQuestion[];
  onComplete?: (answers: Record<string, string>) => void;
};

export default function AiAgentQuestions({ questionList, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customActive, setCustomActive] = useState<Record<string, boolean>>({});
  const [customText, setCustomText] = useState<Record<string, string>>({});

  const currentQ = questionList[currentIndex];
  const isLast = currentIndex === questionList.length - 1;
  const currentAnswer = answers[currentQ?.id] || "";
  const isCustom = !!customActive[currentQ?.id];

  if (!currentQ) return null;

  const handleSelectOption = (option: string) => {
    if (option === "Other / Custom" || option.toLowerCase().includes("custom")) {
      setCustomActive((prev) => ({ ...prev, [currentQ.id]: true }));
      const existingText = customText[currentQ.id] || "";
      setAnswers((prev) => ({ ...prev, [currentQ.id]: existingText }));
    } else {
      setCustomActive((prev) => ({ ...prev, [currentQ.id]: false }));
      setAnswers((prev) => ({ ...prev, [currentQ.id]: option }));
    }
  };

  const handleCustomInputChange = (val: string) => {
    setCustomText((prev) => ({ ...prev, [currentQ.id]: val }));
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  };

  const handleNext = () => {
    if (isLast) {
      onComplete?.(answers);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const progressPercent = Math.round(
    ((currentIndex + 1) / questionList.length) * 100
  );

  return (
    <div className="w-full max-w-2xl mx-auto border rounded-2xl p-6 sm:p-8 bg-white shadow-sm mt-4 space-y-6">
      {/* Progress Bar Header */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <span>
            Question {currentIndex + 1} of {questionList.length}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Subtitle & Question */}
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          HELP ME UNDERSTAND YOUR REQUEST
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
          {currentQ.question}
        </h2>
      </div>

      {/* Options Stack */}
      <div className="space-y-3">
        {currentQ.options?.map((option, idx) => {
          const isCustomOption =
            option === "Other / Custom" || option.toLowerCase().includes("custom");
          const isSelected = isCustomOption
            ? isCustom
            : currentAnswer === option && !isCustom;

          return (
            <div key={idx} className="w-full">
              <button
                type="button"
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span>{option}</span>
                {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
              </button>
            </div>
          );
        })}

        {/* Custom Input Field when custom is selected */}
        {(isCustom || currentQ.allowCustom) && isCustom && (
          <div className="pt-2">
            <Input
              placeholder={
                currentQ.customPlaceholder || "Specify your custom response..."
              }
              value={customText[currentQ.id] || ""}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              className="rounded-xl border-slate-300 py-3 text-sm"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="ghost"
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={!currentAnswer.trim()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          <span>{isLast ? "Continue" : "Next"}</span>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}