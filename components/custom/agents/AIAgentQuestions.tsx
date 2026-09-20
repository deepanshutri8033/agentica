"use client";
import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClarificationQuestion } from "./createAgent";

type Props = {
  questionList: ClarificationQuestion[];
  onComplete?: any;
};

export default function AiAgentQuestions({ questionList, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customSelected, setCustomSelected] = useState<Record<string, boolean>>({});

  const currentQ = questionList[currentIndex];
  const isLast = currentIndex === questionList.length - 1;
  const currentAnswer = answers[currentQ?.id] || "";
  const isCustomActive = !!customSelected[currentQ?.id];

  const handleSelectOption = (option: string) => {
    setCustomSelected((prev) => ({ ...prev, [currentQ.id]: false }));
    setAnswers((prev) => ({ ...prev, [currentQ.id]: option }));
  };

  const handleCustomTextChange = (text: string) => {
    setCustomSelected((prev) => ({ ...prev, [currentQ.id]: true }));
    setAnswers((prev) => ({ ...prev, [currentQ.id]: text }));
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

  if (!currentQ) return null;

  const progressPercent = Math.round(
    ((currentIndex + 1) / questionList.length) * 100
  );

  return (
    <div className="border rounded-2xl p-6 bg-background shadow-sm mt-5">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            Question {currentIndex + 1} of {questionList.length}
          </span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Title */}
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-foreground">
          {currentQ.question}
        </h3>
      </div>

      {/* Options List */}
      <div className="flex flex-wrap gap-2 mb-6">
        {currentQ.options?.map((option, idx) => {
          const isSelected = currentAnswer === option && !isCustomActive;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(option)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-foreground"
              }`}
            >
              {isSelected && <Check className="h-4 w-4" />}
              {option}
            </button>
          );
        })}
      </div>

      {/* Custom Input Field */}
      {currentQ.allowCustom && (
        <div className="mb-6">
          <Input
            placeholder={
              currentQ.customPlaceholder || "Type your custom response..."
            }
            value={isCustomActive ? currentAnswer : ""}
            onChange={(e) => handleCustomTextChange(e.target.value)}
            className="rounded-xl"
          />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!currentAnswer.trim()}
          className="flex items-center gap-2 rounded-xl"
        >
          {isLast ? (
            <>
              Generate Agent
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}