import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

// --- MOCK EXTERNAL LIBRARIES AND CONTEXTS ---

// 1. Mock Entypo for Icons (Using inline SVG/Emoji for web)
const Entypo = ({ name, size }) => {
    let icon = '';
    if (name.includes('google')) icon = '💿';
    else if (name.includes('folder')) icon = '📁';
    else icon = '🎵';
    return <span style={{ fontSize: size / 2 }}>{icon}</span>;
};

// 2. Mock Audio Data (Retained for context, not used directly)
const MockAudioData = [
    { id: 'mock-a1', name: 'Lofi Beat 1', mimeType: 'audio/mp3', url: 'mock_uri_1' },
    { id: 'mock-a2', name: 'Rainy Day', mimeType: 'audio/wav', url: 'mock_uri_2' },
];

// 3. Mock Google Drive File Structure
interface File {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    parents?: string[];
    children?: File[];
    url?: string;
}

const mockFiles: File[] = [
    // Root level files/folders
    { id: 'root-1', name: 'My Music', mimeType: 'application/vnd.google-apps.folder', modifiedTime: new Date().toISOString(), parents: ['root'] },
    { id: 'root-2', name: 'Documents', mimeType: 'application/vnd.google-apps.folder', modifiedTime: new Date().toISOString(), parents: ['root'] },
    { id: 'file-1', name: 'Top Level Audio.mp3', mimeType: 'audio/mp3', modifiedTime: new Date().toISOString(), parents: ['root'] },
    
    // Files inside 'My Music' (root-1)
    { id: 'sub-1-1', name: 'Jazz EP', mimeType: 'application/vnd.google-apps.folder', modifiedTime: new Date().toISOString(), parents: ['root-1'] },
    { id: 'file-2', name: 'Ambient Track.wav', mimeType: 'audio/wav', modifiedTime: new Date().toISOString(), parents: ['root-1'] },

    // Files inside 'Jazz EP' (sub-1-1)
    { id: 'file-3', name: 'Groove 1.mp3', mimeType: 'audio/mp3', modifiedTime: new Date().toISOString(), parents: ['sub-1-1'] },
    { id: 'file-4', name: 'Sax Solo.mp3', mimeType: 'audio/mp3', modifiedTime: new Date().toISOString(), parents: ['sub-1-1'] },

    // Files inside 'Documents' (root-2)
    { id: 'file-doc-1', name: 'Report.pdf', mimeType: 'application/pdf', modifiedTime: new Date().toISOString(), parents: ['root-2'] },
];

// 4. Mock useGoogleDrive Hook
const mockGoogleUserInfo = { email: 'mock.user@example.com' };

const useGoogleDrive = () => {
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [files, setFiles] = useState<File[]>(mockFiles);

    const fetchGoogleDriveFiles = useCallback(() => {
        setLoading(true);
        // Simulate API delay
        setTimeout(() => {
            setFiles(mockFiles);
            setLoading(false);
        }, 1500);
    }, []);

    const signOut = () => {
        setIsAuthenticated(false);
        setFiles([]);
        alert("Logged out (Mock)");
    };

    return {
        googleUserInfo: mockGoogleUserInfo,
        loading,
        files,
        fetchGoogleDriveFiles,
        signOut,
        isAuthenticated,
    };
};

// --- AUDIO PLAYER CONTEXT (PlayerProvider and usePlayer) ---

// 5. Mock expo-audio for Web
// Note: In a real web app, you would use the HTML Audio API, but we mock the state.
const useAudioPlayer = ({ uri }: { uri: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const play = useCallback(() => {
        console.log(`[Player Mock] Playing: ${uri}`);
        setIsPlaying(true);
    }, [uri]);

    const pause = useCallback(() => {
        console.log(`[Player Mock] Pausing: ${uri}`);
        setIsPlaying(false);
    }, [uri]);

    return { isPlaying, play, pause, uri };
};

type PlayerContextType = {
    player: ReturnType<typeof useAudioPlayer>;
    audio: File | null;
    setAudio: (audio: File) => void;
    // For play/pause control on current track
    togglePlayPause: (file: File) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Default audio track 
const defaultAudio: File = mockFiles.find(f => f.mimeType.startsWith('audio/')) || { id: '', name: 'No Track', mimeType: '', modifiedTime: '' };

function PlayerProvider({ children }: PropsWithChildren) {
    const [audio, setAudio] = useState<File>(defaultAudio);
    
    // The player's URI depends on the current audio state
    const player = useAudioPlayer({ uri: audio.url || `https://drive.google.com/d/${audio.id}/stream` }); 

    const togglePlayPause = useCallback((fileToControl: File) => {
        if (fileToControl.id !== audio.id) {
            // Selecting a new file: 1. Set new audio, 2. Play
            setAudio(fileToControl);
            // Since setting audio triggers a state change, we need to defer play() 
            // In this mock, we just call play() immediately.
            setTimeout(() => player.play(), 0); 
        } else {
            // Control the current file
            if (player.isPlaying) {
                player.pause();
            } else {
                player.play();
            }
        }
    }, [audio, player]);

    const contextValue = { player, audio, setAudio, togglePlayPause };

    return (
        <PlayerContext.Provider value={contextValue}>
            {children}
        </PlayerContext.Provider>
    );
}

const usePlayer = () => {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        // This will only happen if usePlayer is used outside PlayerProvider
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};

// --- FILE TREE UTILITY ---

/**
 * Converts a flat list of Google Drive files into a hierarchical tree structure.
 * @param files Flat array of file objects.
 * @returns An array of top-level files/folders with nested children.
 */
const buildFileTree = (files: File[]): File[] => {
    const fileMap: { [key: string]: File & { children: File[] } } = {};
    const rootFiles: File[] = [];

    // 1. Initialize map and children array for all items
    files.forEach(file => {
        fileMap[file.id] = { ...file, children: [] };
    });

    // 2. Build the hierarchy
    files.forEach(file => {
        const item = fileMap[file.id];
        const parents = file.parents || [];

        // Check if it's a root item (no parents, or parent is 'root')
        const isRoot = !parents.length || parents.some(p => p === 'root');

        if (isRoot) {
            rootFiles.push(item);
        } else {
            // Find the immediate parent(s) and attach the item
            parents.forEach(parentId => {
                if (fileMap[parentId] && fileMap[parentId].mimeType.includes("folder")) {
                    fileMap[parentId].children.push(item);
                }
            });
        }
    });

    // Sort folders before files, then alphabetically
    const sortTree = (a, b) => {
        const isAFolder = a.mimeType.includes("folder");
        const isBFolder = b.mimeType.includes("folder");

        if (isAFolder && !isBFolder) return -1;
        if (!isAFolder && isBFolder) return 1;
        return a.name.localeCompare(b.name);
    };

    // Recursively sort the children
    const processNodes = (nodes) => {
        nodes.sort(sortTree);
        nodes.forEach(node => {
            if (node.children) {
                processNodes(node.children);
            }
        });
    };

    processNodes(rootFiles);
    return rootFiles;
};


// --- RECURSIVE FILE TREE COMPONENT (Converted to Web HTML) ---

// Mock for ActivityIndicator
const Spinner = ({ size = 'medium', color = '#4285F4' }) => (
    <div style={{ width: size === 'small' ? '1em' : '2em', height: size === 'small' ? '1em' : '2em', borderColor: color, borderTopColor: 'transparent' }} 
         className="inline-block animate-spin rounded-full border-2 border-solid">
    </div>
);


const FileTreeItem = ({ file, level = 0 }) => {
    const isFolder = file.mimeType.includes("folder");
    const isAudio = file.mimeType.startsWith("audio/");
    const [isExpanded, setIsExpanded] = useState(false);
    const { audio, togglePlayPause, player } = usePlayer();
    
    // Check if the current file is the one actively playing/paused
    const isCurrentTrack = audio && audio.id === file.id;
    const isCurrentlyPlaying = isCurrentTrack && player.isPlaying;

    const handlePress = () => {
        if (isFolder) {
            setIsExpanded(!isExpanded);
        } else if (isAudio) {
            // Only play audio files
            togglePlayPause(file);
        }
    };

    const indent = level * 20; // Increased indent for web readability
    const bgColor = isCurrentTrack ? (isCurrentlyPlaying ? 'hover:bg-green-200 bg-green-100' : 'hover:bg-orange-200 bg-orange-100') : (isFolder ? 'hover:bg-yellow-100 bg-yellow-50' : 'hover:bg-blue-100 bg-blue-50');
    const borderColor = isCurrentTrack ? (isCurrentlyPlaying ? 'border-green-400' : 'border-orange-400') : (isFolder ? 'border-yellow-300' : 'border-blue-300');

    return (
        <div style={{ marginLeft: indent }}>
            <button
                onClick={handlePress}
                className={`w-full text-left p-3 mb-1 rounded-lg border flex items-center transition-colors duration-150 ${bgColor} ${borderColor} shadow-sm`}
            >
                <span className="text-xl mr-2">
                    {isFolder ? (isExpanded ? '📂' : '📁') : (isAudio ? (isCurrentlyPlaying ? '🎶' : '🎧') : '📄')}
                </span>
                <p className="font-medium text-base truncate flex-grow">
                    {file.name}
                </p>
                {isCurrentlyPlaying && <Spinner size="small" color="#10B981" />}
                {isAudio && !isCurrentlyPlaying && isCurrentTrack && (
                     <span className="text-lg text-orange-500 ml-2">⏸️</span>
                )}
                {isAudio && !isCurrentTrack && (
                     <span className="text-lg text-gray-400 ml-2">▶️</span>
                )}
            </button>

            {isExpanded && isFolder && file.children && (
                <div className="mt-1 pl-2">
                    {file.children.length > 0 ? (
                        file.children.map(child => (
                            <FileTreeItem key={child.id} file={child} level={level + 1} />
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm italic ml-5 p-1">
                            (フォルダが空です)
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

// --- MAIN SCREEN COMPONENT (Converted to Web HTML) ---

function GoogleDriveFilesScreen() {
    const {
        googleUserInfo,
        loading,
        files,
        fetchGoogleDriveFiles,
        signOut,
        isAuthenticated,
    } = useGoogleDrive();
    
    const { audio, player } = usePlayer();

    useEffect(() => {
        if (isAuthenticated) {
            fetchGoogleDriveFiles();
        }
    }, [isAuthenticated, fetchGoogleDriveFiles]);

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center p-10 h-screen bg-gray-100">
                <p className="text-2xl mb-4 text-red-600 font-extrabold">ログインが必要です</p>
                <p className="text-gray-600 text-center max-w-sm">
                    Google Driveのファイル一覧を表示するには、認証を行ってください。（これはモック環境です）
                </p>
            </div>
        );
    }

    // 1. Build the file tree
    const fileTree = buildFileTree(files);

    return (
        <div className="flex flex-col h-screen bg-gray-50 p-6 max-w-xl mx-auto shadow-xl rounded-xl">
            {/* Header */}
            <div className="items-center pb-4 border-b border-gray-200 mb-6 flex-shrink-0">
                <h1 className="text-4xl font-extrabold text-blue-600 flex items-center">
                    <Entypo name="google-drive" size={40} />
                    <span className="ml-2">Drive Explorer</span>
                </h1>

                {googleUserInfo && (
                    <p className="text-sm text-gray-600 mt-1">{googleUserInfo.email}</p>
                )}
            </div>

            {/* Current Playing Track Info */}
            <div className={`p-4 mb-4 rounded-xl shadow-lg border-l-4 ${player.isPlaying ? 'bg-green-50 border-green-500' : 'bg-gray-100 border-gray-400'} transition-all duration-300 flex-shrink-0`}>
                <p className="text-lg font-bold mb-1 flex items-center">
                    {player.isPlaying ? '▶️ 再生中' : '⏸️ 一時停止'}
                </p>
                <p className="text-base text-gray-800 font-semibold truncate" title={audio?.name}>
                    {audio?.name || "トラックを選択してください"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {audio?.mimeType.startsWith('audio/') ? `MIME: ${audio.mimeType.split("/")[1]?.toUpperCase()}` : 'ファイルタイプ不明'}
                </p>
            </div>


            {/* File Tree Section (Scrollable) */}
            <div className="overflow-y-auto flex-grow pr-2">
                {loading && !files.length ? (
                    <div className="flex justify-center items-center h-48">
                        <Spinner size="large" color="#4285F4" />
                    </div>
                ) : (
                    <div className="mb-8">
                        <p className="text-xl font-bold mb-3 text-gray-700">
                            クラウドファイル ({files.length}件)
                        </p>
                        {fileTree.length > 0 ? (
                            fileTree.map(file => (
                                <FileTreeItem key={file.id} file={file} level={0} />
                            ))
                        ) : (
                            <div className="items-center py-10 text-center">
                                <p className="text-gray-500 text-lg">
                                    ファイルが見つかりませんでした
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls (Fixed at Bottom) */}
            <div className="mt-6 space-y-3 flex-shrink-0">
                <button
                    onClick={fetchGoogleDriveFiles}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-150 shadow-md disabled:opacity-50"
                >
                    {loading ? '読み込み中...' : '再読み込み'}
                </button>
                <button 
                    onClick={signOut} 
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-150 shadow-md"
                >
                    ログアウト
                </button>
            </div>
        </div>
    );
}

// Combine the App structure
const App = () => (
    <PlayerProvider>
        <GoogleDriveFilesScreen />
    </PlayerProvider>
);

export default App;