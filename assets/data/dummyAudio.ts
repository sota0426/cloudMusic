export interface AudioDataProps{
  id:number;
  title:string;
  author:string;
  audio_url:string;
  thumbnail_url? : string;
}

export const AudioData:AudioDataProps[] = [
  {
    "id": 1,
    "title": "The Adventures of Sherlock Holmes",
    "author": "Sir Arthur Conan Doyle",
    "audio_url": "@/assets/data/audio.mp3",
    "thumbnail_url": "https://archive.org/services/img/adventures_sherlockholmes_1007_librivox"
  },
  {
    "id": 2,
    "title": "Pride and Prejudice",
    "author": "Jane Austen",
    "audio_url": "https://archive.org/download/pride_prejudice_1007_librivox/pp01_austen_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/prideandprejudice_1007_librivox"
  },
  {
    "id": 3,
    "title": "Typee",
    "author": "Herman Melville",
    "audio_url": "https://archive.org/download/typee_librivox/Typee_01_Melville_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/typee_librivox"
  },
  {
    "id": 4,
    "title": "The Letters of Jane Austen",
    "author": "Jane Austen",
    "audio_url": "https://archive.org/download/letters_of_jane_austen_etk_librivox/Letters_of_Jane_Austen_001.mp3",
    "thumbnail_url": "https://archive.org/services/img/lettersofjaneausten_etk_librivox"
  },
  {
    "id": 5,
    "title": "The Adventures of Sherlock Holmes (Version 6, dramatic)",
    "author": "Sir Arthur Conan Doyle",
    "audio_url": "https://archive.org/download/advofsherlockholmes_2010_librivox/Adventures_of_Sherlock_Holmes_V6_001.mp3",
    "thumbnail_url": "https://archive.org/services/img/advofsherlockholmes_2010_librivox"
  },
  {
    "id": 6,
    "title": "Frankenstein; or, The Modern Prometheus",
    "author": "Mary Wollstonecraft Shelley",
    "audio_url": "https://archive.org/download/frankenstein-or-modern-prometheus-by-mary-w-shelley_1104_librivox/Frankenstein_001_Shelley_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/frankenstein-or-modern-prometheus-by-mary-w-shelley_1104_librivox"
  },
  {
    "id": 7,
    "title": "Frankenstein (Dramatic Reading)",
    "author": "Mary Wollstonecraft Shelley",
    "audio_url": "https://archive.org/download/frankenstein-dramatic-reading-by-mary-shelley_1209_librivox/Frankenstein_Dramatic_001.mp3",
    "thumbnail_url": "https://archive.org/services/img/frankenstein-dramatic-reading-by-mary-shelley_1209_librivox"
  },
  {
    "id": 8,
    "title": "Dracula",
    "author": "Bram Stoker",
    "audio_url": "https://archive.org/download/dracula_0908_librivox/Dracula_01_Stoker_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/dracula_0908_librivox"
  },
  {
    "id": 9,
    "title": "Dracula (Version 2, dramatic)",
    "author": "Bram Stoker",
    "audio_url": "https://archive.org/download/dracula-version-2-by-bram-stoker_1004_librivox/Dracula_01.mp3",
    "thumbnail_url": "https://archive.org/services/img/dracula-version-2-by-bram-stoker_1004_librivox"
  },
  {
    "id": 10,
    "title": "The Picture of Dorian Gray",
    "author": "Oscar Wilde",
    "audio_url": "https://archive.org/download/the_picture_of_dorian_gray_1210_librivox/DorianGray_01_Wilde_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/the_picture_of_dorian_gray_1210_librivox"
  },
  {
    "id": 11,
    "title": "The Picture of Dorian Gray (Version 2, dramatic)",
    "author": "Oscar Wilde",
    "audio_url": "https://archive.org/download/the-picture-of-dorian-gray-by-oscar-wilde-2_1012_librivox/DorianGray2_01.mp3",
    "thumbnail_url": "https://archive.org/services/img/the-picture-of-dorian-gray-by-oscar-wilde-2_1012_librivox"
  },
  {
    "id": 12,
    "title": "The Picture of Dorian Gray (Version 3)",
    "author": "Oscar Wilde",
    "audio_url": "https://archive.org/download/the_picture_of_dorian_gray_version_3_2107_librivox/DorianGray3_01_Wilde_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/the_picture_of_dorian_gray_version_3_2107_librivox"
  },
  {
    "id": 13,
    "title": "Dracula (Version 4)",
    "author": "Bram Stoker",
    "audio_url": "https://archive.org/download/dracula-version-4-by-bram-stoker_1903_librivox/Dracula4_01_Stoker_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/dracula-version-4-by-bram-stoker_1903_librivox"
  },
  {
    "id": 14,
    "title": "Tales and Stories",
    "author": "Mary Wollstonecraft Shelley",
    "audio_url": "https://archive.org/download/tales_and_stories_2210_librivox/TalesStories_01_Shelley_64kb.mp3",
    "thumbnail_url": "https://archive.org/services/img/tales_and_stories_2210_librivox"
  },
  {
    "id": 15,
    "title": "Letters of Oscar Wilde, Vol. 2 (1890–1895)",
    "author": "Oscar Wilde",
    "audio_url": "https://archive.org/download/letters_of_oscar_wilde_volume_2_2009_librivox/LettersWilde2_01.mp3",
    "thumbnail_url": "https://archive.org/services/img/letters_of_oscar_wilde_volume_2_2009_librivox"
  }
];