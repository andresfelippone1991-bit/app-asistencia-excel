declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export interface PickedSheetDoc {
  id: string;
  name: string;
  url: string;
}

export const googlePickerService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.gapi);
  },

  openPicker(
    accessToken: string,
    onPick: (doc: PickedSheetDoc) => void,
    onError?: (err: any) => void
  ): void {
    if (!window.gapi) {
      onError?.(new Error('Google API no está cargado aún'));
      return;
    }

    try {
      window.gapi.load('picker', () => {
        try {
          const view = new window.google.picker.DocsView(
            window.google.picker.ViewId.SPREADSHEETS
          );
          view.setMimeTypes('application/vnd.google-apps.spreadsheet');

          const pickerBuilder = new window.google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setCallback((data: any) => {
              if (data.action === window.google.picker.Action.PICKED) {
                const doc = data.docs[0];
                if (doc) {
                  onPick({
                    id: doc.id,
                    name: doc.name,
                    url: doc.url || `https://docs.google.com/spreadsheets/d/${doc.id}/edit`,
                  });
                }
              }
            });

          const picker = pickerBuilder.build();
          picker.setVisible(true);
        } catch (e) {
          onError?.(e);
        }
      });
    } catch (e) {
      onError?.(e);
    }
  },
};
