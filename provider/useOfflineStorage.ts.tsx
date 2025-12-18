// useOfflineStorage.ts
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// @ts-ignore
const DOCUMENT_DIR: string = FileSystem?.documentDirectory || '';
const MUSIC_DIR = `${DOCUMENT_DIR}music/`;
const OFFLINE_METADATA_KEY = '@offline_music_metadata';

export interface OfflineAudioFile {
  id: string;
  name: string;
  localPath: string;
  mimeType?: string;
  source: 'onedrive' | 'googledrive';
  downloadedAt: number;
  fileSize?: number;
}

export interface DownloadTask {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

export function useOfflineStorage() {
  const [offlineFiles, setOfflineFiles] = useState<OfflineAudioFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadTasks, setDownloadTasks] = useState<Map<string, DownloadTask>>(new Map());
  const isNative = Platform.OS !== 'web';

  // ダウンロードタスクを更新
  const updateDownloadTask = (fileId: string, updates: Partial<DownloadTask>) => {
    setDownloadTasks(prev => {
      const newTasks = new Map(prev);
      const existing = newTasks.get(fileId);
      if (existing) {
        newTasks.set(fileId, { ...existing, ...updates });
      } else {
        newTasks.set(fileId, {
          fileId,
          fileName: updates.fileName || '',
          progress: 0,
          status: 'pending',
          ...updates
        });
      }
      return newTasks;
    });
  };

  // ダウンロードタスクを削除
  const removeDownloadTask = (fileId: string) => {
    setDownloadTasks(prev => {
      const newTasks = new Map(prev);
      newTasks.delete(fileId);
      return newTasks;
    });
  };

  // アクティブなダウンロード数を取得
  const getActiveDownloadCount = () => {
    let count = 0;
    downloadTasks.forEach(task => {
      if (task.status === 'downloading') {
        count++;
      }
    });
    return count;
  };

  // メタデータを読み込む
  const loadMetadata = async (): Promise<OfflineAudioFile[]> => {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_METADATA_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
    return [];
  };

  // メタデータを保存する
  const saveMetadata = async (metadata: OfflineAudioFile[]) => {
    try {
      await AsyncStorage.setItem(OFFLINE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  };

  // オフラインファイル一覧を取得
  const fetchOfflineFiles = async () => {
    if (!isNative) return;
    
    setLoading(true);
    try {
      const metadata = await loadMetadata();
      
      // 実際にファイルが存在するかチェック
      const validFiles: OfflineAudioFile[] = [];
      for (const file of metadata) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(file.localPath);
          if (fileInfo.exists) {
            validFiles.push(file);
          }
        } catch (error) {
          console.log('File not found:', file.localPath);
        }
      }
      
      // メタデータを更新(存在しないファイルを除外)
      if (validFiles.length !== metadata.length) {
        await saveMetadata(validFiles);
      }
      
      setOfflineFiles(validFiles);
    } catch (error) {
      console.error('Error fetching offline files:', error);
    } finally {
      setLoading(false);
    }
  };

  // ファイルがダウンロード済みかチェック
  const isFileDownloaded = async (fileId: string): Promise<boolean> => {
    const metadata = await loadMetadata();
    const file = metadata.find(f => f.id === fileId);
    
    if (!file) return false;
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(file.localPath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  };

  // ファイルをダウンロード
  const downloadFile = async (
    fileId: string,
    fileName: string,
    downloadUrl: string,
    mimeType?: string,
    source: 'onedrive' | 'googledrive' = 'onedrive',
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    if (!isNative) return null;

    // タスクを作成
    updateDownloadTask(fileId, {
      fileId,
      fileName,
      progress: 0,
      status: 'downloading'
    });

    try {
      // ディレクトリを作成
      const dirInfo = await FileSystem.getInfoAsync(MUSIC_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MUSIC_DIR, { intermediates: true });
      }

      // ファイル名をサニタイズ
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localPath = `${MUSIC_DIR}${fileId}_${sanitizedName}`;

      // ダウンロード
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localPath,
        {},
        (downloadProgress: any) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          const progressPercent = Math.round(progress * 100);
          
          updateDownloadTask(fileId, {
            progress: progressPercent,
            status: 'downloading'
          });
          
          onProgress?.(progressPercent);
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result) {
        // メタデータを保存
        const metadata = await loadMetadata();
        const newFile: OfflineAudioFile = {
          id: fileId,
          name: fileName,
          localPath: result.uri,
          mimeType,
          source,
          downloadedAt: Date.now(),
        };

        // 既存のエントリを削除して新しいものを追加
        const updatedMetadata = metadata.filter(f => f.id !== fileId);
        updatedMetadata.push(newFile);
        await saveMetadata(updatedMetadata);

        // 状態を更新
        await fetchOfflineFiles();

        // タスクを完了
        updateDownloadTask(fileId, {
          progress: 100,
          status: 'completed'
        });

        // 少し待ってからタスクを削除
        setTimeout(() => removeDownloadTask(fileId), 2000);

        return result.uri;
      }
    } catch (error) {
      console.error('Download error:', error);
      
      // タスクを失敗としてマーク
      updateDownloadTask(fileId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'ダウンロードに失敗しました'
      });

      // 失敗したタスクも一定時間後に削除
      setTimeout(() => removeDownloadTask(fileId), 5000);
      
      throw error;
    }

    return null;
  };

  // 複数ファイルを同時にダウンロード（最大同時ダウンロード数: 3）
  const downloadMultipleFiles = async (
    files: Array<{
      fileId: string;
      fileName: string;
      downloadUrl: string;
      mimeType?: string;
      source?: 'onedrive' | 'googledrive';
    }>,
    maxConcurrent: number = 3
  ): Promise<{ succeeded: number; failed: number; total: number }> => {
    if (!isNative) return { succeeded: 0, failed: 0, total: 0 };

    let succeeded = 0;
    let failed = 0;
    const total = files.length;

    // 既にダウンロード済みのファイルを除外
    const metadata = await loadMetadata();
    const downloadedIds = new Set(metadata.map(f => f.id));
    const filesToDownload = files.filter(f => !downloadedIds.has(f.fileId));

    console.log(`📦 バッチダウンロード開始: ${filesToDownload.length}/${total}個のファイル`);

    // 全てのタスクを pending として登録
    filesToDownload.forEach(file => {
      updateDownloadTask(file.fileId, {
        fileId: file.fileId,
        fileName: file.fileName,
        progress: 0,
        status: 'pending'
      });
    });

    // 並列ダウンロードを実行
    const queue = [...filesToDownload];
    const activeDownloads: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;

      const file = queue.shift()!;

      try {
        await downloadFile(
          file.fileId,
          file.fileName,
          file.downloadUrl,
          file.mimeType,
          file.source || 'onedrive'
        );
        succeeded++;
        console.log(`✅ ダウンロード成功: ${file.fileName} (${succeeded}/${filesToDownload.length})`);
      } catch (error) {
        failed++;
        console.error(`❌ ダウンロード失敗: ${file.fileName}`, error);
      }

      // 次のファイルを処理
      if (queue.length > 0) {
        await processNext();
      }
    };

    // 指定された同時実行数でダウンロードを開始
    for (let i = 0; i < Math.min(maxConcurrent, filesToDownload.length); i++) {
      activeDownloads.push(processNext());
    }

    // 全てのダウンロードが完了するまで待機
    await Promise.all(activeDownloads);

    console.log(`📦 バッチダウンロード完了: 成功${succeeded}個、失敗${failed}個 / 合計${total}個`);

    return { succeeded, failed, total };
  };

  // ファイルを削除
  const deleteFile = async (fileId: string): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const metadata = await loadMetadata();
      const file = metadata.find(f => f.id === fileId);

      if (file) {
        // ファイルを削除
        try {
          await FileSystem.deleteAsync(file.localPath);
        } catch (error) {
          console.log('File already deleted or not found');
        }

        // メタデータから削除
        const updatedMetadata = metadata.filter(f => f.id !== fileId);
        await saveMetadata(updatedMetadata);

        // 状態を更新
        setOfflineFiles(updatedMetadata);
        return true;
      }
    } catch (error) {
      console.error('Delete error:', error);
    }

    return false;
  };

  // ローカルファイルのパスを取得
  const getLocalFilePath = async (fileId: string): Promise<string | null> => {
    const metadata = await loadMetadata();
    const file = metadata.find(f => f.id === fileId);
    
    if (file) {
      // ファイルが実際に存在するか確認
      try {
        const fileInfo = await FileSystem.getInfoAsync(file.localPath);
        if (fileInfo.exists) {
          return file.localPath;
        }
      } catch {
        return null;
      }
    }
    
    return null;
  };

  // 初回ロード
  useEffect(() => {
    if (isNative) {
      fetchOfflineFiles();
    }
  }, []);

  return {
    offlineFiles,
    loading,
    isNative,
    downloadTasks,
    fetchOfflineFiles,
    isFileDownloaded,
    downloadFile,
    downloadMultipleFiles,
    deleteFile,
    getLocalFilePath,
    getActiveDownloadCount,
  };
}