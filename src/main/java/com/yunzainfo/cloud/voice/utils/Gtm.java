package com.yunzainfo.cloud.voice.utils;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class Gtm {
    public static String toGMTString(Date date) {
        SimpleDateFormat df = new SimpleDateFormat("E, dd MMM yyyy HH:mm:ss z", Locale.UK);
        df.setTimeZone(new java.util.SimpleTimeZone(0, "GMT"));
        return df.format(date);
    }
}
