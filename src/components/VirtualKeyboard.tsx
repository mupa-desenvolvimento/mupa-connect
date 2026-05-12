import React, { useRef, useState, useEffect } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import Draggable from "react-draggable";
import { X, GripHorizontal } from "lucide-react";
import { Button } from "./ui/button";

interface VirtualKeyboardProps {
  inputName: string;
  onChange: (input: string) => void;
  onKeyPress?: (button: string) => void;
  initialValue?: string;
  onClose: () => void;
}

const VirtualKeyboard = ({ 
  inputName, 
  onChange, 
  onKeyPress, 
  initialValue = "", 
  onClose 
}: VirtualKeyboardProps) => {
  const keyboard = useRef<any>(null);
  const [layout, setLayout] = useState("default");

  useEffect(() => {
    if (keyboard.current) {
      keyboard.current.setInput(initialValue);
    }
  }, [initialValue, inputName]);

  const handleKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayout(layout === "default" ? "shift" : "default");
    }
    if (button === "{numbers}" || button === "{abc}") {
      setLayout(layout === "numbers" ? "default" : "numbers");
    }
    if (onKeyPress) {
      onKeyPress(button);
    }
  };

  return (
    <Draggable handle=".keyboard-header">
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-[800px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden touch-none select-none">
        <div className="keyboard-header flex items-center justify-between p-3 bg-slate-800 cursor-move border-b border-slate-700">
          <div className="flex items-center gap-3 text-slate-300">
            <GripHorizontal className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Teclado Virtual</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="p-3 bg-slate-900">
          <Keyboard
            keyboardRef={(r) => (keyboard.current = r)}
            layoutName={layout}
            onChange={onChange}
            onKeyPress={handleKeyPress}
            theme="hg-theme-default hg-layout-default dark-keyboard"
            layout={{
              default: [
                "q w e r t y u i o p",
                "a s d f g h j k l",
                "{shift} z x c v b n m {backspace}",
                "{numbers} {space} {ent}"
              ],
              shift: [
                "Q W E R T Y U I O P",
                "A S D F G H J K L",
                "{shift} Z X C V B N M {backspace}",
                "{numbers} {space} {ent}"
              ],
              numbers: [
                "1 2 3",
                "4 5 6",
                "7 8 9",
                "{abc} 0 {backspace}"
              ]
            }}
            display={{
              "{backspace}": "⌫",
              "{ent}": "ok",
              "{shift}": "⇧",
              "{space}": "espaço",
              "{numbers}": "123",
              "{abc}": "ABC"
            }}
          />
        </div>
        <style>{`
          .dark-keyboard {
            background-color: transparent !important;
          }
          .hg-theme-default .hg-button {
            background: #1e293b !important;
            color: white !important;
            border-bottom: 3px solid #0f172a !important;
            height: 50px !important;
            font-size: 1.1rem !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 3px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          }
          @media (min-width: 640px) {
            .hg-theme-default .hg-button {
              height: 60px !important;
              font-size: 1.3rem !important;
            }
          }
          .hg-theme-default .hg-button:active {
            background: #334155 !important;
            transform: translateY(2px) !important;
            border-bottom-width: 1px !important;
          }
          .hg-theme-default .hg-button.hg-standardBtn {
            width: calc(10% - 6px) !important;
          }
          .hg-theme-default .hg-button.hg-functionBtn {
            background: #334155 !important;
            font-size: 1rem !important;
            min-width: 60px !important;
          }
          .hg-theme-default {
            padding: 5px !important;
            background-color: transparent !important;
          }
          .hg-row {
            display: flex !important;
            justify-content: center !important;
          }
        `}</style>
      </div>
    </Draggable>
  );
};

export default VirtualKeyboard;
