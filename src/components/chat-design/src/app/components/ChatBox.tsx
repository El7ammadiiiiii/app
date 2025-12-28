import { useState, useRef, useEffect } from 'react';
import { Plus, Settings2, ChevronRight, ChevronDown } from 'lucide-react';
import notebookLmIcon from 'figma:asset/0ad982f7f3200159b773fe93766cd98787bafa74.png';
import attachMainIcon from 'figma:asset/07a37c70b29fbddab8f8cf405effe334c4841e16.png';
import attachSubIcon from 'figma:asset/7c7418a6e93b406df5a329e1d6a0029796e4ee1f.png';
import canvaIcon from 'figma:asset/dc681ea3e3618018d7957047d52b2f8c444a05cb.png';
import thinkingIcon from 'figma:asset/80ac28b7c40752205d4a09a9a28800b9640c1471.png';
import svgPaths from '../../imports/svg-d2yorthb3w';
import settingsIconPaths from '../../imports/svg-k8pfy92a1g';
import searchIconPaths from '../../imports/svg-44rbb9np92';
import driveIconPaths from '../../imports/svg-asq5lm6sj2';
import canvasIconPaths from '../../imports/svg-0xopru7nz9';
import attachFileIconPaths from '../../imports/svg-jjon7ui9km';
import photoLibraryIconPaths from '../../imports/svg-1xa0vl5ywx';

export default function ChatBox() {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showFileSubmenu, setShowFileSubmenu] = useState(false);
  const [showImageSubmenu, setShowImageSubmenu] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('General agent');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; size: string; type: string }>>([]);
  const [activeTools, setActiveTools] = useState<Array<{ id: string; name: string; icon: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea with smooth transition
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 300) + 'px';
    }
  }, [message]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
        setShowAgentMenu(false);
      }
    };

    if (showSettingsMenu || showPlusMenu || showAgentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu, showPlusMenu, showAgentMenu]);

  const handleSend = () => {
    if (message.trim()) {
      console.log('إرسال الرسالة:', message);
      console.log('الملفات المرفقة:', uploadedFiles);
      setMessage('');
      setUploadedFiles([]); // Clear uploaded files after sending
    }
  };

  const handleVoiceToText = () => {
    setIsRecording(!isRecording);
    console.log(isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل الصوي');
  };

  const handleVoiceCall = () => {
    console.log('بدء مكالمة صوتية');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map(file => ({
        id: Date.now().toString() + file.name,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type
      }));
      setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
      console.log('ملفات مرفوعة:', newFiles);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map(file => ({
        id: Date.now().toString() + file.name,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type
      }));
      setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
      console.log('صور مرفوعة:', newFiles);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  const addTool = (toolName: string) => {
    // Check if tool is already active
    if (activeTools.some(tool => tool.name === toolName)) {
      return;
    }

    const newTool = {
      id: Date.now().toString(),
      name: toolName,
      icon: toolName // We'll use this to determine which icon to render
    };

    setActiveTools(prev => [...prev, newTool]);
  };

  const removeTool = (toolId: string) => {
    setActiveTools(prev => prev.filter(tool => tool.id !== toolId));
  };

  // Get file icon and color based on type
  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Images
    if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
      return {
        icon: (
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="#10B981" fillOpacity="0.1"/>
            <path d="M3 15L8 10L12 14L17 9L21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15Z" fill="#10B981"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="#10B981"/>
          </svg>
        ),
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
    
    // PDFs
    if (extension === 'pdf') {
      return {
        icon: (
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#EF4444" fillOpacity="0.1"/>
            <path d="M14 2V8H20" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="7" y="16" fontSize="6" fontWeight="bold" fill="#EF4444">PDF</text>
          </svg>
        ),
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    
    // Word Documents
    if (['doc', 'docx'].includes(extension || '')) {
      return {
        icon: (
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#2563EB" fillOpacity="0.1"/>
            <path d="M14 2V8H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 12H16M8 16H12" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
    
    // Excel
    if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
      return {
        icon: (
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#10B981" fillOpacity="0.1"/>
            <path d="M14 2V8H20" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="8" y="11" width="8" height="8" stroke="#10B981" strokeWidth="1.5" fill="none"/>
            <path d="M12 11V19M8 15H16" stroke="#10B981" strokeWidth="1.5"/>
          </svg>
        ),
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
    
    // PowerPoint
    if (['ppt', 'pptx'].includes(extension || '')) {
      return {
        icon: (
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#F97316" fillOpacity="0.1"/>
            <path d="M14 2V8H20" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="8" y="11" width="8" height="6" rx="1" stroke="#F97316" strokeWidth="1.5" fill="none"/>
          </svg>
        ),
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }
    
    // Text files
    if (['txt', 'md', 'json', 'xml'].includes(extension || '')) {
      return {
        icon: (
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#6B7280" fillOpacity="0.1"/>
            <path d="M14 2V8H20M8 12H16M8 16H16M8 20H12" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      };
    }
    
    // Zip/Archive
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return {
        icon: (
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#8B5CF6" fillOpacity="0.1"/>
            <path d="M14 2V8H20" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="11" y="3" width="2" height="1.5" fill="#8B5CF6"/>
            <rect x="11" y="5.5" width="2" height="1.5" fill="#8B5CF6"/>
            <rect x="11" y="8" width="2" height="1.5" fill="#8B5CF6"/>
          </svg>
        ),
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    }
    
    // Default
    return {
      icon: (
        <svg className="size-4" fill="none" viewBox="0 0 24 24">
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#6B7280" fillOpacity="0.1"/>
          <path d="M14 2V8H20" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="14" r="2" fill="#6B7280"/>
        </svg>
      ),
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  return (
    <div className="w-full max-w-[800px] mx-auto">
      <div className="bg-white border border-gray-200 rounded-t-2xl shadow-lg shadow-black/5 overflow-hidden transition-all duration-300 ease-in-out">
        {/* Main Input Area */}
        <div className="p-5">
          {/* Uploaded Files Area */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {uploadedFiles.map((file) => {
                const fileIcon = getFileIcon(file.name, file.type);
                return (
                  <div
                    key={file.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-200 text-[10px] group hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center size-3.5">
                      {fileIcon.icon}
                    </div>
                    <span className="text-gray-900 font-medium max-w-[120px] truncate leading-tight">{file.name}</span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="ml-0.5 text-gray-400 hover:text-gray-900 transition-colors"
                      aria-label="حذف الملف"
                    >
                      <svg className="size-2.5" fill="none" viewBox="0 0 16 16">
                        <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Text Input - Full Width */}
          <div className="w-full mb-4">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك هنا..."
              className="w-full bg-transparent border-none outline-none resize-none text-[15px] leading-7 text-gray-900 placeholder:text-gray-400 transition-all duration-200"
              style={{ 
                overflow: 'hidden',
                minHeight: '56px',
                maxHeight: '300px'
              }}
            />
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {/* Left Actions */}
            <div className="flex items-center gap-1.5 relative">
              <div ref={plusMenuRef} className="relative">
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className={`inline-flex items-center justify-center size-9 rounded-lg transition-colors ${
                    showPlusMenu 
                      ? 'text-gray-900 bg-gray-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-label="إضافة"
                  title="إضافة"
                >
                  <Plus className="size-5" />
                </button>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                  multiple
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                  multiple
                />

                {/* Dropdown Menu */}
                {showPlusMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-60 bg-white border border-gray-200 rounded-lg shadow-xl shadow-black/10 overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    <div className="py-1">
                      {/* Add File or Image with Submenu */}
                      <div 
                        className="relative group"
                        onMouseEnter={() => setShowFileSubmenu(true)}
                        onMouseLeave={() => setShowFileSubmenu(false)}
                      >
                        <button
                          className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center size-4">
                              <img src={attachMainIcon} alt="Attach" className="w-full h-full object-contain" />
                            </div>
                            <span>Add File or Image</span>
                          </div>
                          <ChevronRight className="size-3.5 text-gray-400" />
                        </button>

                        {/* File Submenu */}
                        {showFileSubmenu && (
                          <div className="absolute left-full top-0 ml-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl shadow-black/10 overflow-visible animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  fileInputRef.current?.click();
                                  setShowPlusMenu(false);
                                  setShowFileSubmenu(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center justify-center size-4">
                                  <svg className="size-4" fill="none" viewBox="0 0 96 96">
                                    <path d={attachFileIconPaths.p2c9a6a80} fill="black" />
                                  </svg>
                                </div>
                                <span>Attach</span>
                              </button>
                              
                              {/* Image with Nested Submenu */}
                              <div 
                                className="relative group/image"
                                onMouseEnter={() => setShowImageSubmenu(true)}
                                onMouseLeave={() => setShowImageSubmenu(false)}
                              >
                                <button
                                  className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex items-center justify-center size-4">
                                      <svg className="size-4" fill="none" viewBox="0 0 96 96">
                                        <path d={photoLibraryIconPaths.p21047480} fill="black" />
                                      </svg>
                                    </div>
                                    <span>Image</span>
                                  </div>
                                  <ChevronRight className="size-3.5 text-gray-400" />
                                </button>

                                {/* Image Submenu */}
                                {showImageSubmenu && (
                                  <div className="absolute left-full top-0 ml-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          console.log('Take photo from camera');
                                          setShowPlusMenu(false);
                                          setShowFileSubmenu(false);
                                          setShowImageSubmenu(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center justify-center size-4">
                                          <span className="text-sm">📷</span>
                                        </div>
                                        <span>Take Photo from Camera</span>
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          imageInputRef.current?.click();
                                          setShowPlusMenu(false);
                                          setShowFileSubmenu(false);
                                          setShowImageSubmenu(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center justify-center size-4">
                                          <span className="text-sm">⬆️</span>
                                        </div>
                                        <span>Upload from Device</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Create Image Canvas - Changed to Canva */}
                      <button
                        onClick={() => {
                          addTool('Canva');
                          setShowPlusMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center size-4">
                          <img src={canvaIcon} alt="Canva" className="w-full h-full object-contain" />
                        </div>
                        <span>Canva</span>
                      </button>
                      
                      {/* Connect Google Drive */}
                      <button
                        onClick={() => {
                          console.log('Connect Google Drive selected');
                          setShowPlusMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center size-4">
                          <svg className="size-4" fill="none" viewBox="0 0 96 96">
                            <path d={driveIconPaths.p302a0800} fill="black" />
                          </svg>
                        </div>
                        <span>Connect Google Drive</span>
                      </button>
                      
                      {/* NotebookLM */}
                      <button
                        onClick={() => {
                          console.log('NotebookLM selected');
                          setShowPlusMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center size-4">
                          <img src={notebookLmIcon} alt="NotebookLM" className="w-full h-full object-contain" />
                        </div>
                        <span>NotebookLM</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div ref={settingsMenuRef} className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={`inline-flex items-center justify-center size-9 rounded-lg transition-colors ${
                    showSettingsMenu 
                      ? 'text-gray-900 bg-gray-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-label="الإعدادات"
                  title="الإعدادات"
                >
                  <Settings2 className="size-5" />
                </button>

                {/* Dropdown Menu */}
                {showSettingsMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          addTool('Canvas');
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center size-4">
                          <svg className="size-4" fill="none" viewBox="0 0 96 96">
                            <path d={canvasIconPaths.p1b2df800} fill="black" />
                          </svg>
                        </div>
                        <span>Canvas</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          addTool('Thinking');
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center size-4">
                          <img src={thinkingIcon} alt="Thinking" className="w-full h-full object-contain" />
                        </div>
                        <span>Thinking…</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          addTool('Research');
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="size-4 flex-shrink-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                          <path d={settingsIconPaths.p3c44e780} fill="black" />
                        </svg>
                        <span>Research</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          addTool('Search');
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="size-4 flex-shrink-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                          <path d={searchIconPaths.pd00c960} fill="black" />
                        </svg>
                        <span>Search</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Tools Display - Left Side */}
              {activeTools.map((tool) => {
                // Determine which icon to render
                let toolIcon;
                switch (tool.name) {
                  case 'Canvas':
                    toolIcon = (
                      <svg className="size-3.5" fill="none" viewBox="0 0 96 96">
                        <path d={canvasIconPaths.p1b2df800} fill="#2563EB" />
                      </svg>
                    );
                    break;
                  case 'Thinking':
                    toolIcon = <img src={thinkingIcon} alt="Thinking" className="size-3.5 object-contain" />;
                    break;
                  case 'Research':
                    toolIcon = (
                      <svg className="size-3.5" fill="none" viewBox="0 0 16 16">
                        <path d={settingsIconPaths.p3c44e780} fill="#2563EB" />
                      </svg>
                    );
                    break;
                  case 'Search':
                    toolIcon = (
                      <svg className="size-3.5" fill="none" viewBox="0 0 16 16">
                        <path d={searchIconPaths.pd00c960} fill="#2563EB" />
                      </svg>
                    );
                    break;
                  case 'Canva':
                    toolIcon = <img src={canvaIcon} alt="Canva" className="size-3.5 object-contain" />;
                    break;
                  default:
                    toolIcon = <span className="text-xs">{tool.icon}</span>;
                }

                return (
                  <div
                    key={tool.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs hover:border-gray-300 transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-center justify-center">
                      {toolIcon}
                    </div>
                    <span className="text-blue-600 font-medium">{tool.name}</span>
                    <button
                      onClick={() => removeTool(tool.id)}
                      className="ml-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={`إزالة ${tool.name}`}
                    >
                      <svg className="size-3" fill="none" viewBox="0 0 16 16">
                        <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Agent Selector Button - Right Side */}
              <div ref={agentMenuRef} className="relative">
                <button
                  onClick={() => setShowAgentMenu(!showAgentMenu)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    showAgentMenu 
                      ? 'text-gray-900 bg-gray-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-label="العامل"
                  title="العامل"
                >
                  <span>{selectedAgent}</span>
                  <ChevronDown className="size-3.5" />
                </button>

                {/* Dropdown Menu */}
                {showAgentMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          console.log('General agent selected');
                          setSelectedAgent('General agent');
                          setShowAgentMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>General agent</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          console.log('Technical Analysis agent selected');
                          setSelectedAgent('Technical Analysis agent');
                          setShowAgentMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>Technical Analysis agent</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          console.log('On-Chain agent selected');
                          setSelectedAgent('On-Chain agent');
                          setShowAgentMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>On-Chain agent</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          console.log('Fundamental Analysis agent selected');
                          setSelectedAgent('Fundamental Analysis agent');
                          setShowAgentMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>Fundamental Analysis agent</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Single Action Button - Shows Mic when empty, Send when typing */}
              {!message.trim() ? (
                // Voice to Text Button (shown when no text)
                <button
                  onClick={handleVoiceToText}
                  className={`inline-flex items-center justify-center size-9 rounded-lg transition-all duration-200 ${
                    isRecording 
                      ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-black/20 scale-105' 
                      : 'bg-[rgba(0,0,0,0.04)] hover:bg-gray-200'
                  }`}
                  aria-label="تحويل الصوت لنص"
                  title="تحويل الصوت لنص"
                >
                  <svg className="block size-4" fill="none" preserveAspectRatio="none" viewBox="0 0 26 30">
                    <path d={svgPaths.p18b46c80} fill="currentColor" />
                  </svg>
                </button>
              ) : (
                // Send Button (shown when typing)
                <button
                  onClick={handleSend}
                  className="inline-flex items-center justify-center size-9 rounded-lg bg-black text-white hover:bg-gray-800 active:scale-95 transition-all duration-200"
                  aria-label="إرسال"
                  title="إرسال"
                >
                  <svg className="block size-4" fill="none" preserveAspectRatio="none" viewBox="0 0 26.0008 28">
                    <path d={svgPaths.p3a6ce400} fill="currentColor" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}