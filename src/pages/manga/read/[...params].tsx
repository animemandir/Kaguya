import ReadContainer from "@/components/features/manga/Reader/ReadContainer";
import Button from "@/components/shared/Button";
import Head from "@/components/shared/Head";
import Loading from "@/components/shared/Loading";
import Portal from "@/components/shared/Portal";
import { ReadContextProvider } from "@/contexts/ReadContext";
import { ReadSettingsContextProvider } from "@/contexts/ReadSettingsContext";
import useFetchImages from "@/hooks/useFetchImages";
import useSavedRead from "@/hooks/useSavedRead";
import useSaveRead from "@/hooks/useSaveRead";
import supabase from "@/lib/supabase";
import { Chapter, Manga } from "@/types";
import { getTitle, sortMediaUnit } from "@/utils/data";
import { GetServerSideProps, NextPage } from "next";
import { useTranslation } from "next-i18next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ReadPanel = dynamic(
  () => import("@/components/features/manga/Reader/ReadPanel"),
  {
    ssr: false,
  }
);

interface ReadPageProps {
  manga: Manga;
}

const ReadPage: NextPage<ReadPageProps> = ({ manga }) => {
  const router = useRouter();
  const [showReadOverlay, setShowReadOverlay] = useState(false);
  const [declinedReread, setDeclinedReread] = useState(false);
  const saveReadTimeout = useRef<NodeJS.Timeout>();
  const { locale } = useRouter();
  const { t } = useTranslation("manga_read");
  const saveReadMutation = useSaveRead();

  const title = useMemo(() => getTitle(manga, locale), [manga, locale]);

  const chapters = useMemo(
    () =>
      sortMediaUnit(
        manga.sourceConnections.flatMap((connection) => connection.chapters)
      ),
    [manga]
  );

  const { params } = router.query;
  const [
    mangaId,
    sourceId = chapters[0].sourceId,
    chapterId = chapters[0].sourceChapterId,
  ] = params as string[];

  const {
    data: savedReadData,
    isLoading: isSavedDataLoading,
    isError: isSavedDataError,
  } = useSavedRead(Number(mangaId));

  const sourceChapters = useMemo(
    () => chapters.filter((chapter) => chapter.sourceId === sourceId),
    [chapters, sourceId]
  );

  const currentChapter = useMemo(
    () =>
      sourceChapters.find((chapter) => chapter.sourceChapterId === chapterId),
    [sourceChapters, chapterId]
  );

  const currentChapterIndex = useMemo(
    () =>
      sourceChapters.findIndex(
        (chapter) => chapter.sourceChapterId === chapterId
      ),
    [sourceChapters, chapterId]
  );

  const nextChapter = useMemo(
    () => sourceChapters[Number(currentChapterIndex) + 1],
    [currentChapterIndex, sourceChapters]
  );

  const readChapter = useMemo(
    () =>
      isSavedDataError
        ? null
        : chapters.find(
            (chapter) =>
              chapter.sourceChapterId ===
                savedReadData?.chapter.sourceChapterId &&
              chapter.sourceId === savedReadData?.chapter.sourceId
          ),
    [chapters, savedReadData, isSavedDataError]
  );

  const { data, isError, error, isLoading } = useFetchImages(
    currentChapter,
    nextChapter
  );

  const handleChapterNavigate = useCallback(
    (chapter: Chapter) => {
      router.replace(
        `/manga/read/${mangaId}/${chapter.sourceId}/${chapter.sourceChapterId}`,
        null,
        {
          shallow: true,
        }
      );
    },
    [mangaId, router]
  );

  useEffect(() => {
    if (
      !readChapter ||
      isSavedDataLoading ||
      isSavedDataError ||
      declinedReread
    )
      return;

    if (currentChapter.sourceChapterId === readChapter?.sourceChapterId) {
      setDeclinedReread(true);

      return;
    }

    setShowReadOverlay(true);
  }, [
    currentChapter.sourceChapterId,
    declinedReread,
    isSavedDataError,
    isSavedDataLoading,
    readChapter,
  ]);

  useEffect(() => {
    if (saveReadTimeout.current) {
      clearTimeout(saveReadTimeout.current);
    }

    saveReadTimeout.current = setTimeout(
      () =>
        saveReadMutation.mutate({
          chapter_id: `${currentChapter.source.id}-${currentChapter.sourceChapterId}`,
          media_id: Number(mangaId),
        }),
      10000
    );

    return () => {
      clearTimeout(saveReadTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter, mangaId]);

  return (
    <ReadContextProvider
      value={{
        manga,
        currentChapter,
        currentChapterIndex,
        chapters,
        setChapter: handleChapterNavigate,
        sourceId,
        images: data?.images,
      }}
    >
      <ReadSettingsContextProvider>
        <div className="flex items-center justify-center w-full min-h-screen">
          <Head
            title={`${title} (${currentChapter.name}) - Kaguya`}
            description={t("head_description", {
              title,
              chapterName: currentChapter.name,
            })}
            image={manga.bannerImage || manga.coverImage.extraLarge}
          />

          {isError ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-8">
              <div className="space-y-4">
                <p className="text-4xl font-semibold">｡゜(｀Д´)゜｡</p>
                <p className="text-xl">
                  {t("error_message", { error: error?.response?.data?.error })}
                </p>
              </div>

              <Button primary onClick={router.back}>
                <p>
                  {" "}
                  {t("error_goback", { error: error?.response?.data?.error })}
                </p>
              </Button>
            </div>
          ) : (
            <ReadPanel>
              {!isLoading ? <ReadContainer /> : <Loading />}
            </ReadPanel>
          )}

          {showReadOverlay && !declinedReread && (
            <Portal>
              <div
                className="fixed inset-0 z-40 bg-black/70"
                onClick={() => {
                  setShowReadOverlay(false);
                  setDeclinedReread(true);
                }}
              />

              <div className="fixed left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-11/12 lg:w-2/3 p-8 rounded-md bg-background-900">
                <h1 className="text-4xl font-bold mb-4">
                  {t("reread_heading", { chapterName: readChapter.name })}
                </h1>
                <p>
                  {t("reread_description", { chapterName: readChapter.name })}
                </p>
                <p className="mb-4">
                  {t("reread_question", { chapterName: readChapter.name })}
                </p>
                <div className="flex items-center justify-end space-x-4">
                  <Button
                    onClick={() => {
                      setShowReadOverlay(false), setDeclinedReread(true);
                    }}
                    className="!bg-transparent hover:!bg-white/20 transition duration-300"
                  >
                    <p>{t("reread_no")}</p>
                  </Button>
                  <Button
                    onClick={() => {
                      if (!readChapter || isSavedDataLoading) return;

                      const chapter = chapters.find(
                        (chapter) =>
                          chapter.sourceChapterId ===
                            readChapter.sourceChapterId &&
                          chapter.sourceId === readChapter.sourceId
                      );

                      handleChapterNavigate(chapter);
                    }}
                    primary
                  >
                    <p>{t("reread_yes")}</p>
                  </Button>
                </div>
              </div>
            </Portal>
          )}
        </div>
      </ReadSettingsContextProvider>
    </ReadContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params: { params },
}) => {
  const { data, error } = await supabase
    .from<Manga>("kaguya_manga")
    .select(
      `
        title,
        sourceConnections:kaguya_manga_source!mediaId(*, chapters:kaguya_chapters(*, source:kaguya_sources(id, name, locales))),
        bannerImage,
        coverImage,
        vietnameseTitle
      `
    )
    .eq("id", Number(params[0]))
    .single();

  if (error) {
    console.log(error);

    return { notFound: true };
  }

  return {
    props: {
      manga: data,
    },
  };
};

// @ts-ignore
ReadPage.getLayout = (page) => page;

export default ReadPage;
