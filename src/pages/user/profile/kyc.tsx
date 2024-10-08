import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/layouts/Default";
import Card from "@/components/elements/base/card/Card";
import $fetch from "@/utils/api";
import { useDashboardStore } from "@/stores/dashboard";
import { useTranslation } from "next-i18next";
import { BackButton } from "@/components/elements/base/button/BackButton";
import Input from "@/components/elements/form/input/Input";
import Textarea from "@/components/elements/form/textarea/Textarea";
import { debounce } from "lodash";
import InputFile from "@/components/elements/form/input-file/InputFile";
import Avatar from "@/components/elements/base/avatar/Avatar";
import CheckboxHeadless from "@/components/elements/form/checkbox/CheckboxHeadless";
import InputFileField from "@/components/elements/form/input-file-field/InputFileField";
import Button from "@/components/elements/base/button/Button";
interface KycTemplate {
  id: string;
  options: Record<string, any>;
  customOptions: Record<string, any>;
}

const KycApplication: React.FC = () => {
  const { t } = useTranslation();
  const { profile, fetchProfile, setIsFetched } = useDashboardStore();
  const router = useRouter();
  const templateLevel = parseInt(router.query.l as string);
  const [activeTemplate, setActiveTemplate] = useState<KycTemplate | null>(
    null
  );
  const [level, setLevel] = useState(0);
  const [formValues, setFormValues] = useState<any>({});
  const [formErrors, setFormErrors] = useState<any>({});
  const [generalKeys, setGeneralKeys] = useState<string[]>([]);
  const [documentKeys, setDocumentKeys] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [customFieldsFileUpload, setCustomFieldsFileUpload] = useState<any[]>(
    []
  );
  const [frontFile, setFrontFile] = useState<FileList | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [backFile, setBackFile] = useState<FileList | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<FileList | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const inputs = {
    firstName: {
      title: t("First Name"),
      autocomplete: "given-name",
      type: "text",
    },
    lastName: {
      title: t("Last Name"),
      autocomplete: "family-name",
      type: "text",
    },
    email: {
      title: t("Email"),
      autocomplete: "email",
      type: "email",
    },
    phone: {
      title: t("Phone"),
      autocomplete: "tel",
      type: "tel",
    },
    address: {
      title: t("Address"),
      autocomplete: "street-address",
      type: "text",
    },
    city: {
      title: t("City"),
      autocomplete: "address-level2",
      type: "text",
    },
    state: {
      title: t("State"),
      autocomplete: "address-level1",
      type: "text",
    },
    country: {
      title: t("Country"),
      autocomplete: "country",
      type: "text",
    },
    zip: {
      title: t("Zip"),
      autocomplete: "postal-code",
      type: "text",
    },
    dob: {
      title: t("Date of Birth"),
      autocomplete: "bday",
      type: "date",
    },
    ssn: {
      title: t("SSN"),
      autocomplete: "",
      type: "number",
    },
    documentPassport: {
      title: t("Passport"),
      type: "upload",
      description: t("Upload a clear image of your passport."),
    },
    documentDriversLicense: {
      title: t("Driver License"),
      type: "upload",
      description: t("Upload a clear image of your driver license."),
    },
    documentIdCard: {
      title: t("National ID"),
      type: "upload",
      description: t("Upload a clear image of your national ID card."),
    },
  };
  const documentRequirements: Record<
    string,
    {
      side: string;
      fileRef: React.Dispatch<React.SetStateAction<FileList | null>>;
      toastMessage: string;
      image?: string;
    }[]
  > = {
    documentPassport: [
      {
        side: "front",
        fileRef: setFrontFile,
        toastMessage: t("passport front side"),
        image: "/img/kyc/documentPassport.png",
      },
      {
        side: "selfie",
        fileRef: setSelfieFile,
        toastMessage: t("passport selfie"),
      },
    ],
    documentDriversLicense: [
      {
        side: "front",
        fileRef: setFrontFile,
        toastMessage: t("driver license front side"),
        image: "/img/kyc/documentDriversLicense.png",
      },
      {
        side: "selfie",
        fileRef: setSelfieFile,
        toastMessage: t("driver license selfie"),
      },
    ],
    documentIdCard: [
      {
        side: "front",
        fileRef: setFrontFile,
        toastMessage: t("national id front side"),
        image: "/img/kyc/documentIdCard.png",
      },
      {
        side: "back",
        fileRef: setBackFile,
        toastMessage: t("national id back side"),
        image: "/img/kyc/documentIdCardBack.png",
      },
      {
        side: "selfie",
        fileRef: setSelfieFile,
        toastMessage: t("national id selfie"),
      },
    ],
  };
  const handleFileUpload = async (file: File) => {
    const fileToBase64 = async (file: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject("Error reading file");
        reader.readAsDataURL(file);
      });
    };
    const base64File = await fileToBase64(file);
    const img = new Image();
    img.src = base64File;
    await new Promise((resolve) => (img.onload = resolve));
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const filePayload = {
      file: base64File,
      dir: `kyc/${selectedDocument}`,
      width: Number(width) > 720 ? 720 : Number(width),
      height: Number(height) > 720 ? 720 : Number(height),
      oldPath: "",
    };
    try {
      const { data, error } = await $fetch({
        url: "/api/upload",
        method: "POST",
        body: filePayload,
        silent: true,
      });
      if (error) {
        throw new Error("File upload failed");
      }
      return {
        success: 1,
        file: {
          url: data.url,
        },
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      return { success: 0 };
    }
  };

  useEffect(() => {
    const kycLevel = parseInt(profile?.kyc?.level || "0");
    setLevel(kycLevel);
  }, [profile]);

  const fetchActiveKycTemplate = async () => {
    const { data, error } = await $fetch({
      url: "/api/user/kyc/template",
      silent: true,
    });
    if (!error) {
      const options = JSON.parse(data.options, (key, value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      });
      const customFields = JSON.parse(data.customOptions, (key, value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      });
      setActiveTemplate({ ...data, options, customFields });
      const generalKeys = Object.keys(options).filter(
        (key) =>
          !key.startsWith("document") &&
          options[key].enabled &&
          parseInt(options[key].level) === templateLevel
      );
      setGeneralKeys(generalKeys);
      const documentKeys = Object.keys(options).filter(
        (key) =>
          key.startsWith("document") &&
          options[key].enabled &&
          parseInt(options[key].level) === templateLevel
      );
      setDocumentKeys(documentKeys);
      // Update custom fields
      const customFieldsFileUpload = Object.keys(customFields).map((key) => ({
        name: key,
        ...customFields[key],
      }));
      setCustomFieldsFileUpload(customFieldsFileUpload);
    } else {
      router.push("/user");
    }
  };

  const debouncedFetchActiveKycTemplate = debounce(fetchActiveKycTemplate, 100);
  useEffect(() => {
    if (router.isReady) {
      debouncedFetchActiveKycTemplate();
    }
  }, [router.isReady]);

  const handleCustomFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    validateField(key, value);
  };

  const validateField = (key: string, value: any) => {
    const fieldOptions = activeTemplate?.options[key];
    if (!fieldOptions) return;
    if (fieldOptions.required && (!value || value === "")) {
      setFormErrors((prev) => ({ ...prev, [key]: "This field is required" }));
      return;
    }
    setFormErrors((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  };

  const validateCustomFields = () => {
    if (!activeTemplate) return;
    const newCustomFieldErrors: (string | null)[] = [];
    const filteredCustomFields = Object.values(
      activeTemplate.customOptions
    ).filter((field: any) => parseInt(field.level) === level);
    filteredCustomFields.forEach((field: any, index: number) => {
      const value = formValues[field.name as string];
      if ((!value || value === "") && field.type !== "file upload") {
        newCustomFieldErrors[index] = "This field is required";
      } else {
        newCustomFieldErrors[index] = null;
      }
    });
    setFormErrors((prev) => ({
      ...prev,
      customOptions: newCustomFieldErrors,
    }));
  };

  const submit = async () => {
    // Validate fields and custom fields
    generalKeys.forEach((key) => validateField(key, formValues[key]));
    validateCustomFields();
    const hasErrors = Object.values(formErrors).some((error) => {
      if (Array.isArray(error)) {
        return error.some((item) => item !== null);
      }
      return error !== null;
    });
    if (hasErrors) {
      // Handle error case (e.g., show a toast)
      return;
    }
    const documents = {
      documentPassport: {
        front: null,
        selfie: null,
      },
      documentDriversLicense: {
        front: null,
        selfie: null,
      },
      documentIdCard: {
        front: null,
        back: null,
        selfie: null,
      },
    };
    // Add document URLs if uploaded
    if (frontFile && selectedDocument !== null) {
      const uploadResponse = await handleFileUpload(frontFile[0]);
      if (uploadResponse.success && uploadResponse.file) {
        documents[selectedDocument].front = uploadResponse.file.url;
        setFrontPreviewUrl(uploadResponse.file.url);
      }
    }
    if (backFile && selectedDocument === "documentIdCard") {
      const uploadResponse = await handleFileUpload(backFile[0]);
      if (uploadResponse.success && uploadResponse.file) {
        documents[selectedDocument].back = uploadResponse.file.url;
        setBackPreviewUrl(uploadResponse.file.url);
      }
    }
    if (selfieFile && selectedDocument !== null) {
      const uploadResponse = await handleFileUpload(selfieFile[0]);
      if (uploadResponse.success && uploadResponse.file) {
        documents[selectedDocument].selfie = uploadResponse.file.url;
        setSelfiePreviewUrl(uploadResponse.file.url);
      }
    }

    // Remove documents with null values
    const filteredDocuments = Object.entries(documents).reduce(
      (acc, [key, value]) => {
        const nonNullValues = Object.entries(value).reduce(
          (innerAcc, [innerKey, innerValue]) => {
            if (innerValue !== null) {
              innerAcc[innerKey] = innerValue;
            }
            return innerAcc;
          },
          {}
        );
        if (Object.keys(nonNullValues).length > 0) {
          acc[key] = nonNullValues;
        }
        return acc;
      },
      {}
    );

    const fields = {
      ...formValues,
      documents: filteredDocuments,
      ...customFieldsFileUpload.reduce((acc, field) => {
        acc[field.name] = formValues[field.name];
        return acc;
      }, {}),
    };

    const { error } = await $fetch({
      url: "/api/user/kyc/application",
      method: "POST",
      body: { fields, templateId: activeTemplate?.id, level: templateLevel },
    });
    if (!error) {
      await setIsFetched(false);
      await fetchProfile();
      router.push("/user/profile?tab=kyc");
    }
  };

  return (
    <Layout title={t("KYC Application")} color="muted">
      <div className="mx-auto text-muted-800 dark:text-muted-100 max-w-2xl">
        <div className="flex justify-between items-center w-full mb-5">
          <h1 className="text-xl">{t("KYC Application")}</h1>
          <BackButton href="/user/profile?tab=kyc" />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* General Information */}
          {generalKeys.length > 0 && (
            <Card className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {generalKeys.map((key) => (
                  <div key={key}>
                    <Input
                      label={inputs[key].title}
                      type={inputs[key].type}
                      name={key}
                      value={formValues[key] || ""}
                      onChange={(e) =>
                        handleCustomFieldChange(key, e.target.value)
                      }
                      autoComplete={inputs[key].autocomplete}
                    />
                    {formErrors[key] && (
                      <p className="text-red-500">{formErrors[key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {/* Document Upload */}
          {documentKeys.length > 0 && (
            <Card className="p-5 mt-5 flex flex-col gap-5">
              <h2>{t("Document Upload")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {documentKeys.map((key) => (
                  <CheckboxHeadless
                    key={key}
                    checked={selectedDocument === key}
                    onChange={() => setSelectedDocument(key)}
                  >
                    <Card
                      shape="rounded"
                      className="border-2 p-4 opacity-50 peer-checked:!border-primary-500 peer-checked:opacity-100 peer-checked:[&_.child]:!text-primary-500"
                    >
                      <div className="flex w-full items-center gap-2">
                        <Avatar
                          size="md"
                          src={
                            selectedDocument === key
                              ? `/img/kyc/icon-${key}-color.png`
                              : `/img/kyc/icon-${key}.png`
                          }
                          shape="rounded"
                        />

                        <div>
                          <h5 className="font-sans text-sm font-medium leading-none text-muted-800 dark:text-muted-100">
                            {inputs[key].title}
                          </h5>

                          <p className="font-sans text-xs text-muted-400">
                            {inputs[key].description}
                          </p>
                        </div>

                        <div className="child ms-auto text-muted-300">
                          <div className="h-3 w-3 rounded-full bg-current"></div>
                        </div>
                      </div>
                    </Card>
                  </CheckboxHeadless>
                ))}
              </div>
              {selectedDocument && (
                <div className="mt-4 flex flex-col gap-5">
                  {/* Front Side */}
                  <div className="mt-2">
                    <label className="text-md">{t("Front Side")}</label>
                    <InputFile
                      id={`${selectedDocument}-front`}
                      acceptedFileTypes={[
                        "image/png",
                        "image/jpeg",
                        "image/jpg",
                        "image/gif",
                        "image/svg+xml",
                        "image/webp",
                      ]}
                      preview={frontPreviewUrl || ""}
                      previewPlaceholder={
                        documentRequirements[selectedDocument].find(
                          (req) => req.side === "front"
                        )?.image
                      }
                      maxFileSize={2}
                      label={`${t("Max File Size")}: 2 MB`}
                      labelAlt={`${t("Size")}: 720x720 px`}
                      bordered
                      color="default"
                      onChange={(files) => setFrontFile(files as any)}
                      onRemoveFile={() => {
                        setFrontFile(null);
                        setFrontPreviewUrl(null);
                      }}
                    />

                    {formErrors.front && (
                      <p className="text-red-500 text-sm mt-2">
                        {formErrors.front}
                      </p>
                    )}
                  </div>
                  {/* Back Side */}
                  {selectedDocument === "documentIdCard" && (
                    <div className="mt-2">
                      <label className="text-md">{t("Back Side")}</label>
                      <InputFile
                        id={`${selectedDocument}-back`}
                        acceptedFileTypes={[
                          "image/png",
                          "image/jpeg",
                          "image/jpg",
                          "image/gif",
                          "image/svg+xml",
                          "image/webp",
                        ]}
                        preview={backPreviewUrl || ""}
                        previewPlaceholder={
                          documentRequirements[selectedDocument].find(
                            (req) => req.side === "back"
                          )?.image
                        }
                        maxFileSize={2}
                        label={`${t("Max File Size")}: 2 MB`}
                        labelAlt={`${t("Size")}: 720x720 px`}
                        bordered
                        color="default"
                        onChange={(files) => setBackFile(files as any)}
                        onRemoveFile={() => {
                          setBackFile(null);
                          setBackPreviewUrl(null);
                        }}
                      />
                      {formErrors.back && (
                        <p className="text-red-500 text-sm mt-2">
                          {formErrors.back}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Selfie */}
                  <div className="mt-2">
                    <label className="text-md">{t("Selfie")}</label>
                    <InputFile
                      id={`${selectedDocument}-selfie`}
                      acceptedFileTypes={[
                        "image/png",
                        "image/jpeg",
                        "image/jpg",
                        "image/gif",
                        "image/svg+xml",
                        "image/webp",
                      ]}
                      preview={selfiePreviewUrl || ""}
                      previewPlaceholder={"/img/kyc/documentSelfie.png"}
                      maxFileSize={2}
                      label={`${t("Max File Size")}: 2 MB`}
                      labelAlt={`${t("Size")}: 720x720 px`}
                      bordered
                      color="default"
                      onChange={(files) => setSelfieFile(files as any)}
                      onRemoveFile={() => {
                        setSelfieFile(null);
                        setSelfiePreviewUrl(null);
                      }}
                    />
                    {formErrors.selfie && (
                      <p className="text-red-500 text-sm mt-2">
                        {formErrors.selfie}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
          {/* Custom Fields */}
          {customFieldsFileUpload.length > 0 && (
            <Card className="p-5 mt-5">
              <h2>
                {t("Extra Information for your account verification process")}
              </h2>
              <span className="text-muted-400 text-sm mt-2">
                {t(
                  "To verify your identity, we ask you to fill in the following information."
                )}
              </span>
              <div className="flex flex-col gap-5">
                {customFieldsFileUpload.map((field, index) => (
                  <div key={index}>
                    {field.type === "input" && (
                      <Input
                        type="text"
                        label={field.name}
                        name={field.name}
                        value={formValues[field.name] || ""}
                        onChange={(e) =>
                          handleCustomFieldChange(field.name, e.target.value)
                        }
                      />
                    )}
                    {field.type === "textarea" && (
                      <Textarea
                        label={field.name}
                        name={field.name}
                        value={formValues[field.name] || ""}
                        onChange={(e) =>
                          handleCustomFieldChange(field.name, e.target.value)
                        }
                      />
                    )}
                    {field.type === "file" && (
                      <InputFileField
                        id={field.name}
                        label={`${t("Max File Size")}: ${
                          field.maxSize || 2
                        } MB`}
                        value={formValues[field.name]?.name || ""}
                        maxFileSize={field.maxSize || 2}
                        acceptedFileTypes={field.acceptedFileTypes}
                        onChange={(e) =>
                          handleCustomFieldChange(field.name, e.target.files)
                        }
                      />
                    )}
                    {field.type === "image" && (
                      <InputFileField
                        id={field.name}
                        label={`${t("Max File Size")}: ${
                          field.maxSize || 2
                        } MB`}
                        value={formValues[field.name]?.name || ""}
                        maxFileSize={field.maxSize || 2}
                        acceptedFileTypes={[
                          "image/png",
                          "image/jpeg",
                          "image/jpg",
                          "image/gif",
                          "image/svg+xml",
                          "image/webp",
                        ]}
                        onChange={(e) =>
                          handleCustomFieldChange(field.name, e.target.files)
                        }
                      />
                    )}
                    {formErrors.customOptions &&
                      formErrors.customOptions[index] && (
                        <p className="text-red-500">
                          {formErrors.customOptions[index]}
                        </p>
                      )}
                  </div>
                ))}
              </div>
            </Card>
          )}
          <div className="flex justify-center items-center w-full mt-5">
            <Card className="p-3 text-end text-md flex justify-center items-center gap-3 max-w-sm">
              <div className="w-full">
                <Button
                  className="w-full"
                  color="muted"
                  onClick={() => router.push("/user/profile?tab=kyc")}
                >
                  {t("Cancel")}
                </Button>
              </div>
              <div className="w-full">
                <Button className="w-full" type="submit" color="primary">
                  {t("Submit")}
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </Layout>
  );
};
export default KycApplication;
